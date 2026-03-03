import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────
// Settings interface: all rules that drive payroll
// ─────────────────────────────────────────────────────────
export interface PayrollSettingsData {
    basic_percent: number;          // % of Gross → Basic Salary (default 50)
    hra_percent: number;            // % of Basic → HRA (default 40)
    conveyance: number;             // Fixed monthly conveyance allowance (default 5000)
    medical: number;                // Fixed monthly medical allowance (default 5000)
    pf_percent: number;             // Employee PF % (default 12)
    employer_pf_percent: number;    // Employer PF % (default 12)
    pf_limit: number;               // PF wage cap (default 15000 → max EPF = 1800)
    professional_tax: number;       // Fixed state PT (default 200)
    esi_enabled: boolean;           // Auto-disable when gross > 21000
    working_days_per_month: number; // Used for LOP per-day rate (default 26)
}

export const DEFAULT_SETTINGS: PayrollSettingsData = {
    basic_percent: 50,
    hra_percent: 40,
    conveyance: 5000,
    medical: 5000,
    pf_percent: 12,
    employer_pf_percent: 12,
    pf_limit: 15000,
    professional_tax: 200,
    esi_enabled: false,
    working_days_per_month: 26,
};

// ─────────────────────────────────────────────────────────
// Full salary breakdown (returned from calculateSalary)
// ─────────────────────────────────────────────────────────
export interface SalaryBreakdown {
    // Earnings
    gross: number;
    basic: number;
    hra: number;
    conveyance: number;
    medical: number;
    other_allowances: number;
    total_earnings: number;         // = gross (always)
    // Deductions
    pf_employee: number;            // 12% of min(basic, pf_limit)
    pf_employer: number;            // 12% of min(basic, pf_limit)
    epf_display: number;            // = pf_employee + pf_employer (shown in payslip)
    esi_employee: number;           // 0.75% if gross ≤ 21000 and esi_enabled
    esi_employer: number;           // 3.25%
    professional_tax: number;
    lop_deduction: number;
    total_deductions: number;       // pf_employee + esi_employee + pt + lop
    // Net
    net_salary: number;             // gross − total_deductions
    // Meta
    lop_days: number;
    working_days: number;
}

// ─────────────────────────────────────────────────────────
// Pure calculation function — the single source of truth
// Used by PayrollSettings sandbox, payroll engine, and payslip preview
// ─────────────────────────────────────────────────────────
export const calculateSalary = (
    gross: number,
    settings: PayrollSettingsData,
    lop_days = 0,
    days_in_month = 30,
    custom_pf_employee?: number,
    custom_pf_employer?: number
): SalaryBreakdown => {
    const g = Math.max(0, gross);

    // Earnings breakdown
    const basic = Math.round(g * (settings.basic_percent / 100));
    const hra = Math.round(basic * (settings.hra_percent / 100));
    const conveyance = settings.conveyance;
    const medical = settings.medical;
    const other_allowances = Math.max(0, g - basic - hra - conveyance - medical);
    const total_earnings = g; // always equals gross

    // PF — 12% by default or custom override
    const pf_base = Math.min(basic, settings.pf_limit);
    const emp_pf_rate = custom_pf_employee ?? settings.pf_percent;
    const boss_pf_rate = custom_pf_employer ?? settings.employer_pf_percent;

    const pf_employee = Math.round(pf_base * (emp_pf_rate / 100));
    const pf_employer = Math.round(pf_base * (boss_pf_rate / 100));
    const epf_display = pf_employee + pf_employer; // shown as single line in payslip

    // ESI — only if gross ≤ ₹21,000 and enabled
    const esi_eligible = settings.esi_enabled && g <= 21000;
    const esi_employee = esi_eligible ? Math.round(g * 0.75 / 100) : 0;
    const esi_employer = esi_eligible ? Math.round(g * 3.25 / 100) : 0;

    // Professional Tax (fixed by state)
    const professional_tax = settings.professional_tax;

    // LOP — daily rate = Gross ÷ days in month
    const daily_rate = days_in_month > 0 ? g / days_in_month : 0;
    const lop_deduction = Math.round(daily_rate * lop_days);

    // Deductions: employee contributions only reduce net pay
    const total_deductions = epf_display + esi_employee + professional_tax + lop_deduction;
    const net_salary = Math.max(0, g - total_deductions);

    return {
        gross: g, basic, hra, conveyance, medical, other_allowances, total_earnings,
        pf_employee, pf_employer, epf_display, esi_employee, esi_employer,
        professional_tax, lop_deduction, total_deductions, net_salary,
        lop_days, working_days: settings.working_days_per_month,
    };
};

// ─────────────────────────────────────────────────────────
// Hook: load/save payroll settings from Supabase
// ─────────────────────────────────────────────────────────
export const usePayrollSettings = () => {
    const [settings, setSettings] = useState<PayrollSettingsData>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error: fetchErr } = await supabase
                .from('company_settings')
                .select('value')
                .eq('key', 'payroll_settings')
                .maybeSingle();
            if (fetchErr) throw fetchErr;
            if (data?.value) setSettings({ ...DEFAULT_SETTINGS, ...data.value });
        } catch (err: any) {
            console.error('[usePayrollSettings] fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const saveSettings = async (updated: PayrollSettingsData): Promise<boolean> => {
        setSaving(true);
        setError(null);
        try {
            const { error: upsertErr } = await supabase
                .from('company_settings')
                .upsert({ key: 'payroll_settings', value: updated }, { onConflict: 'key' });
            if (upsertErr) throw upsertErr;
            setSettings(updated);
            return true;
        } catch (err: any) {
            console.error('[usePayrollSettings] save error:', err);
            setError(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    return { settings, loading, saving, error, saveSettings, refetch: fetchSettings };
};

// ─────────────────────────────────────────────────────────
// Standalone fetch — used in payroll generation engine
// ─────────────────────────────────────────────────────────
export const fetchPayrollSettings = async (): Promise<PayrollSettingsData> => {
    try {
        const { data } = await supabase
            .from('company_settings')
            .select('value')
            .eq('key', 'payroll_settings')
            .maybeSingle();
        if (data?.value) return { ...DEFAULT_SETTINGS, ...data.value };
    } catch (e) {
        console.warn('[fetchPayrollSettings] using defaults:', e);
    }
    return DEFAULT_SETTINGS;
};
