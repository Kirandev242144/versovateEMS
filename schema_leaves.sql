-- ============================================================
-- VERSOVATE: Leave Management Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Leave Types (Casual, Sick, Earned, etc.)
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,                   -- 'Casual', 'Sick', 'Earned'
    annual_quota INTEGER NOT NULL DEFAULT 12,    -- Days granted per year
    description TEXT,
    color TEXT DEFAULT '#6E40FF',               -- Badge color
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default leave types
INSERT INTO leave_types (name, annual_quota, description, color) VALUES
    ('Casual Leave', 12, 'For personal or family matters', '#6E40FF'),
    ('Sick Leave', 12, 'For illness or medical appointments', '#FF4B4B'),
    ('Earned Leave', 15, 'Accrued based on tenure', '#00BFA5'),
    ('Unpaid Leave', 0, 'Leave without pay', '#9E9E9E')
ON CONFLICT (name) DO NOTHING;

-- 2. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) NOT NULL DEFAULT 1,  -- Supports 0.5 for half-day
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_period TEXT CHECK (half_day_period IN ('morning', 'afternoon')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Leave Balances (per employee, per year, per leave type)
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    total_days NUMERIC(5,1) NOT NULL DEFAULT 0,   -- Annual quota
    used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
    remaining_days NUMERIC(5,1) GENERATED ALWAYS AS (total_days - used_days) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, leave_type_id, year)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- leave_types: Everyone can read
CREATE POLICY "Anyone can read leave types" ON leave_types FOR SELECT USING (true);
CREATE POLICY "Admin can manage leave types" ON leave_types FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- leave_requests: Employees see own, admin sees all
CREATE POLICY "Employees see own requests" ON leave_requests FOR SELECT
    USING (employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Employees can create own requests" ON leave_requests FOR INSERT
    WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admin can update any request" ON leave_requests FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Employee can cancel own pending request" ON leave_requests FOR UPDATE
    USING (employee_id = auth.uid() AND status = 'Pending');

-- leave_balances: Employees see own, admin sees all
CREATE POLICY "Employees see own balances" ON leave_balances FOR SELECT
    USING (employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admin can manage balances" ON leave_balances FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Helper Function: Initialize leave balances for new employee
-- Call this after adding a new employee
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_leave_balances(p_employee_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
    lt RECORD;
BEGIN
    FOR lt IN SELECT id, annual_quota FROM leave_types WHERE annual_quota > 0 LOOP
        INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
        VALUES (p_employee_id, lt.id, v_year, lt.annual_quota, 0)
        ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize balances for all existing employees
DO $$
DECLARE
    emp RECORD;
BEGIN
    FOR emp IN SELECT id FROM profiles WHERE role = 'employee' AND status != 'Terminated' LOOP
        PERFORM initialize_leave_balances(emp.id);
    END LOOP;
END;
$$;

-- ============================================================
-- Trigger: Auto-update updated_at on leave_requests
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER set_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER set_leave_balances_updated_at
    BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
