-- ============================================================
-- VERSOVATE: Manual EPF Overrides & Deferred Impact
-- Add columns to profiles to support per-employee EPF settings
-- ============================================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS epf_employee_percent NUMERIC(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS epf_employer_percent NUMERIC(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS pending_epf_employee NUMERIC(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS pending_epf_employer NUMERIC(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS epf_update_month    TEXT DEFAULT NULL; -- Format: YYYY-MM

COMMENT ON COLUMN profiles.epf_update_month IS 'The month when the pending EPF changes were last saved. Used to trigger deferred impact logic.';
