-- ============================================================
-- VERSOVATE: Attendance Working Days Migration
-- ============================================================

-- 1. Add work_days to profiles table (0=Sun, 1=Mon, ..., 6=Sat)
-- Defaulting to Mon-Fri (1,2,3,4,5)
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5];

-- 2. Update existing profiles (if any) to have the default
UPDATE profiles SET work_days = ARRAY[1, 2, 3, 4, 5] WHERE work_days IS NULL;

-- 3. Update mark_leave_in_attendance function to respect employee's work_days
CREATE OR REPLACE FUNCTION mark_leave_in_attendance(
    p_employee_id UUID,
    p_start_date  DATE,
    p_end_date    DATE,
    p_is_half_day BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
    v_current_date DATE;
    v_record       RECORD;
    v_breakdown    JSONB;
    v_entry        JSONB;
    v_entry_idx    INTEGER;
    v_old_status   TEXT;
    v_days_present INT;
    v_days_lop     INT;
    v_days_leave   INT;
    v_work_days    INTEGER[];
BEGIN
    -- Get employee's working days
    SELECT work_days INTO v_work_days FROM profiles WHERE id = p_employee_id;
    -- Fallback to Mon-Fri if not set
    IF v_work_days IS NULL THEN
        v_work_days := ARRAY[1, 2, 3, 4, 5];
    END IF;

    -- Iterate over each calendar date in the leave range
    v_current_date := p_start_date;

    WHILE v_current_date <= p_end_date LOOP
        -- Skip non-working days (based on v_work_days)
        IF EXTRACT(DOW FROM v_current_date)::INTEGER = ANY(v_work_days) THEN

            -- Find the weekly_attendance record that covers this date
            SELECT * INTO v_record
            FROM weekly_attendance
            WHERE employee_id = p_employee_id
              AND week_start_date <= v_current_date
              AND week_end_date   >= v_current_date
            LIMIT 1;

            IF v_record IS NOT NULL THEN
                -- Find the entry in daily_breakdown for this date
                v_breakdown := v_record.daily_breakdown;
                v_entry_idx := -1;
                v_old_status := NULL;

                FOR i IN 0 .. jsonb_array_length(v_breakdown) - 1 LOOP
                    IF (v_breakdown -> i ->> 'date') = v_current_date::TEXT THEN
                        v_entry_idx  := i;
                        v_old_status := v_breakdown -> i ->> 'status';
                    END IF;
                END LOOP;

                IF v_entry_idx >= 0 AND v_old_status IS DISTINCT FROM 'Leave' AND v_old_status IS DISTINCT FROM 'Holiday' THEN
                    -- Patch the entry status → Leave
                    v_entry := v_breakdown -> v_entry_idx;
                    v_entry := jsonb_set(v_entry, '{status}', '"Leave"');
                    v_breakdown := jsonb_set(v_breakdown, ARRAY[v_entry_idx::TEXT], v_entry);

                    -- Recalculate summary counts from the updated breakdown
                    v_days_present := 0;
                    v_days_lop     := 0;
                    v_days_leave   := 0;

                    FOR i IN 0 .. jsonb_array_length(v_breakdown) - 1 LOOP
                        CASE v_breakdown -> i ->> 'status'
                            WHEN 'Present' THEN v_days_present := v_days_present + 1;
                            WHEN 'Absent'  THEN v_days_lop     := v_days_lop + 1;
                            WHEN 'Leave'   THEN v_days_leave   := v_days_leave + 1;
                            ELSE NULL;
                        END CASE;
                    END LOOP;

                    -- Write back the updated record
                    UPDATE weekly_attendance
                    SET daily_breakdown = v_breakdown,
                        days_present    = v_days_present,
                        days_lop        = v_days_lop,
                        days_paid_leave = v_days_leave,
                        updated_at      = NOW()
                    WHERE id = v_record.id;
                END IF;
            END IF;
        END IF;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
