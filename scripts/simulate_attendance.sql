-- VERSOVATE: Attendance Simulation SQL
-- Run this in the Supabase SQL Editor to generate random attendance data for Feb 10 - Mar 6, 2026.

DO $$
DECLARE
    v_emp RECORD;
    v_week RECORD;
    v_current_date DATE;
    v_breakdown JSONB;
    v_status TEXT;
    v_present INT;
    v_absent INT;
    v_leave INT;
    v_holiday INT;
    v_work_days INTEGER[];
BEGIN
    -- Define the weeks to process
    FOR v_week IN 
        SELECT '2026-02-09'::DATE as start_date, '2026-02-15'::DATE as end_date
        UNION ALL SELECT '2026-02-16', '2026-02-22'
        UNION ALL SELECT '2026-02-23', '2026-03-01'
        UNION ALL SELECT '2026-03-02', '2026-03-08'
    LOOP
        -- Process each active employee
        FOR v_emp IN 
            SELECT id, work_days FROM profiles WHERE role = 'employee' AND status IN ('Active', 'On Leave')
        LOOP
            v_work_days := COALESCE(v_emp.work_days, ARRAY[1, 2, 3, 4, 5]);
            v_breakdown := '[]'::JSONB;
            v_present := 0;
            v_absent := 0;
            v_leave := 0;
            v_holiday := 0;

            v_current_date := v_week.start_date;
            WHILE v_current_date <= v_week.end_date LOOP
                -- Determine status
                IF EXTRACT(DOW FROM v_current_date)::INTEGER = ANY(v_work_days) THEN
                    -- Only randomize for Feb 10 - Mar 6
                    IF v_current_date BETWEEN '2026-02-10'::DATE AND '2026-03-06'::DATE THEN
                        -- 90% chance of Present, 10% Absent
                        IF random() > 0.1 THEN
                            v_status := 'Present';
                            v_present := v_present + 1;
                        ELSE
                            v_status := 'Absent';
                            v_absent := v_absent + 1;
                        END IF;
                    ELSE
                        -- Default for days outside simulation range but in the week
                        v_status := 'Present';
                        v_present := v_present + 1;
                    END IF;
                ELSE
                    v_status := 'Holiday';
                    v_holiday := v_holiday + 1;
                END IF;

                -- Append to breakdown
                v_breakdown := v_breakdown || jsonb_build_object(
                    'date', v_current_date::TEXT,
                    'day', to_char(v_current_date, 'Dy'),
                    'status', v_status
                );

                v_current_date := v_current_date + INTERVAL '1 day';
            END LOOP;

            -- Upsert into weekly_attendance
            INSERT INTO weekly_attendance (
                employee_id, 
                week_start_date, 
                week_end_date, 
                days_present, 
                days_lop, 
                days_paid_leave, 
                days_holiday, 
                daily_breakdown, 
                status
            )
            VALUES (
                v_emp.id,
                v_week.start_date,
                v_week.end_date,
                v_present,
                v_absent,
                v_leave,
                v_holiday,
                v_breakdown,
                'Approved'
            )
            ON CONFLICT (employee_id, week_start_date) DO UPDATE SET
                days_present = EXCLUDED.days_present,
                days_lop = EXCLUDED.days_lop,
                days_paid_leave = EXCLUDED.days_paid_leave,
                days_holiday = EXCLUDED.days_holiday,
                daily_breakdown = EXCLUDED.daily_breakdown,
                status = EXCLUDED.status,
                updated_at = NOW();

        END LOOP;
    END LOOP;
END $$;
