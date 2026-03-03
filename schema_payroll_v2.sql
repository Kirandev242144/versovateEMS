-- ============================================================
-- VERSOVATE: Payroll Schema Patch v2
-- Adds conveyance, medical, ESI columns and updates settings seed
-- Run AFTER schema_compensation.sql
-- ============================================================

-- 1. Add conveyance, medical, ESI columns to payroll_records
ALTER TABLE payroll_records
    ADD COLUMN IF NOT EXISTS conveyance    NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS medical       NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS esi_employee  NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS esi_employer  NUMERIC(12,2) DEFAULT 0;

-- 2. Update company_settings with full payroll rules
-- (includes basic_percent, hra_percent, conveyance, medical, esi_enabled)
INSERT INTO company_settings (key, value) VALUES (
    'payroll_settings',
    '{
        "basic_percent": 50,
        "hra_percent": 40,
        "conveyance": 5000,
        "medical": 5000,
        "pf_percent": 12,
        "employer_pf_percent": 12,
        "pf_limit": 15000,
        "professional_tax": 200,
        "esi_enabled": false,
        "working_days_per_month": 26
    }'::JSONB
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
