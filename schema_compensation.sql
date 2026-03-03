-- ============================================================
-- VERSOVATE: Dynamic Compensation Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add compensation columns to profiles
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS basic_salary      NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hra               NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS special_allowance NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_allowances  NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pf_enabled        BOOLEAN DEFAULT TRUE;

-- Migrate existing salary_amount to basic_salary (preserve data)
UPDATE profiles
SET basic_salary = COALESCE(salary_amount, 0)
WHERE basic_salary = 0 AND salary_amount IS NOT NULL AND salary_amount > 0;

-- 2. Add detailed payroll component columns to payroll_records
ALTER TABLE payroll_records
    ADD COLUMN IF NOT EXISTS gross_salary      NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hra               NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS special_allowance NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_allowances  NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pf_employee       NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pf_employer       NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS professional_tax  NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS working_days      INTEGER DEFAULT 26;

-- 3. Create company_settings table for PayrollSettings persistence
CREATE TABLE IF NOT EXISTS company_settings (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key             TEXT NOT NULL UNIQUE,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read and write; others can only read
CREATE POLICY "Anyone can read company settings" ON company_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin can update company settings" ON company_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed default payroll settings row
INSERT INTO company_settings (key, value) VALUES (
    'payroll_settings',
    '{
        "pf_percent": 12,
        "employer_pf_percent": 12,
        "pf_limit": 15000,
        "professional_tax": 200,
        "working_days_per_month": 26
    }'::JSONB
) ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at on company_settings
DROP TRIGGER IF EXISTS set_company_settings_updated_at ON company_settings;
CREATE TRIGGER set_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
