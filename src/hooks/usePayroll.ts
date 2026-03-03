import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchPayrollSettings, calculateSalary } from './usePayrollSettings';

export interface PayrollRecord {
    id: string;
    employee_id: string;
    month_year: string;
    // Earnings (stored in DB)
    gross_salary: number;
    basic_salary: number;
    hra: number;
    conveyance: number;
    medical: number;
    other_allowances: number;
    // Deductions
    total_lop_days: number;
    lop_deduction_amount: number;
    pf_employee: number;
    pf_employer: number;
    esi_employee: number;
    esi_employer: number;
    professional_tax: number;
    working_days: number;
    // Net
    net_salary: number;
    status: 'Draft' | 'Processed' | 'Paid';
    processed_date: string;
    paid_date: string | null;
    profile?: {
        full_name: string;
        custom_id: string;
        department: string;
        profile_pic_url: string;
        bank_account_number: string;
        bank_ifsc: string;
        bank_name: string;
    };
}

export const usePayroll = (targetMonthYear?: string) => {
    const [records, setRecords] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const isMounted = useRef(true);
    const hasLoadedOnce = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const fetchRecords = useCallback(async (monthYear: string) => {
        if (!isMounted.current) return;
        if (!hasLoadedOnce.current) setLoading(true);
        setError(null);

        try {
            const timeoutId = setTimeout(() => {
                if (isMounted.current) {
                    setLoading(false);
                    setError('Connection is slow. Please check your internet or try refreshing.');
                }
            }, 15000);

            const { data, error: fetchErr } = await supabase
                .from('payroll_records')
                .select(`
                    *,
                    profile:profiles(full_name, custom_id, department, profile_pic_url, bank_account_number, bank_ifsc, bank_name, job_title, join_date)
                `)
                .eq('month_year', monthYear)
                .order('processed_date', { ascending: false });

            clearTimeout(timeoutId);
            if (fetchErr) throw fetchErr;
            if (isMounted.current) setRecords(data as PayrollRecord[] || []);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
            console.error('Error fetching payroll:', err);
            if (isMounted.current) setError(err.message || 'Failed to fetch payroll records.');
        } finally {
            if (isMounted.current) {
                setLoading(false);
                hasLoadedOnce.current = true;
            }
        }
    }, []);

    useEffect(() => {
        if (targetMonthYear) {
            fetchRecords(targetMonthYear);
        } else {
            setLoading(false);
        }

        const handleRefresh = () => {
            if (targetMonthYear) fetchRecords(targetMonthYear);
        };
        window.addEventListener('versovate:refresh', handleRefresh);
        return () => window.removeEventListener('versovate:refresh', handleRefresh);
    }, [targetMonthYear, fetchRecords]);

    // ─────────────────────────────────────────────────────────
    // Generate payroll — gross-based, all deductions auto-calculated
    // ─────────────────────────────────────────────────────────
    const generatePayroll = async (monthYear: string) => {
        setGenerating(true);
        setError(null);

        try {
            const [yearStr, monthStr] = monthYear.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            const daysInMonth = new Date(year, month, 0).getDate();

            // 1. Fetch payroll settings (PF%, PT, conveyance, etc.)
            const payrollSettings = await fetchPayrollSettings();

            // 2. Fetch active employees with EPF settings
            const { data: employees, error: empErr } = await supabase
                .from('profiles')
                .select(`
                    id, salary_amount, other_allowances, status,
                    epf_employee_percent, epf_employer_percent,
                    pending_epf_employee, pending_epf_employer, epf_update_month
                `)
                .eq('role', 'employee')
                .in('status', ['Active', 'On Leave']);

            if (empErr) throw empErr;
            if (!employees || employees.length === 0)
                throw new Error('No active employees found to run payroll.');

            // 3. Fetch approved attendance records
            const { data: attRecords, error: attErr } = await supabase
                .from('weekly_attendance')
                .select('employee_id, daily_breakdown')
                .eq('status', 'Approved');

            if (attErr) throw attErr;

            // 4. Payroll cycle: 10th of prev month → 9th of target month
            const cycleStart = new Date(year, month - 2, 10);
            const cycleEnd = new Date(year, month - 1, 9);
            cycleStart.setHours(0, 0, 0, 0);
            cycleEnd.setHours(0, 0, 0, 0);

            // 5. Build upsert payload & updates for profiles
            const upsertPayload: any[] = [];
            const profileUpdates: any[] = [];

            employees.forEach(emp => {
                const gross = Number(emp.salary_amount) || 0;

                // Deferred impact logic:
                // If targetMonthYear > epf_update_month, use PENDING values.
                // If it's the SAME or PREVIOUS month, use CURRENT values.
                let activeEmpPF = emp.epf_employee_percent;
                let activeBossPF = emp.epf_employer_percent;

                const isFutureMonth = emp.epf_update_month && monthYear > emp.epf_update_month;

                if (isFutureMonth && emp.pending_epf_employee !== null) {
                    activeEmpPF = emp.pending_epf_employee;
                    activeBossPF = emp.pending_epf_employer;

                    // When we finally generate a "future" month, we "promote" the pending values to current
                    profileUpdates.push({
                        id: emp.id,
                        epf_employee_percent: emp.pending_epf_employee,
                        epf_employer_percent: emp.pending_epf_employer,
                        pending_epf_employee: null,
                        pending_epf_employer: null,
                        epf_update_month: null
                    });
                }

                // Count LOP days
                let lopCount = 0;
                const myAttendance = attRecords?.filter(r => r.employee_id === emp.id) || [];
                myAttendance.forEach(sheet => {
                    const days = sheet.daily_breakdown;
                    if (Array.isArray(days)) {
                        days.forEach((d: any) => {
                            const dateObj = new Date(d.date);
                            dateObj.setHours(0, 0, 0, 0);
                            if (dateObj >= cycleStart && dateObj <= cycleEnd && d.status === 'Absent') {
                                lopCount++;
                            }
                        });
                    }
                });

                // Calculate full breakdown using gross + settings + custom PF
                const bd = calculateSalary(gross, payrollSettings, lopCount, daysInMonth, activeEmpPF, activeBossPF);

                // Use admin-set other_allowances if provided, otherwise use computed remainder
                const finalOtherAllowances = (emp.other_allowances != null && Number(emp.other_allowances) > 0)
                    ? Number(emp.other_allowances)
                    : bd.other_allowances;

                upsertPayload.push({
                    employee_id: emp.id,
                    month_year: monthYear,
                    // Earnings
                    gross_salary: bd.gross,
                    basic_salary: bd.basic,
                    hra: bd.hra,
                    conveyance: bd.conveyance,
                    medical: bd.medical,
                    other_allowances: finalOtherAllowances,
                    // Deductions
                    total_lop_days: lopCount,
                    lop_deduction_amount: bd.lop_deduction,
                    pf_employee: bd.pf_employee,
                    pf_employer: bd.pf_employer,
                    esi_employee: bd.esi_employee,
                    esi_employer: bd.esi_employer,
                    professional_tax: bd.professional_tax,
                    working_days: payrollSettings.working_days_per_month,
                    // Net
                    net_salary: bd.net_salary,
                    status: 'Processed',
                });
            });

            // 6. Upsert into payroll_records
            const { error: upsertErr } = await supabase
                .from('payroll_records')
                .upsert(upsertPayload, { onConflict: 'employee_id,month_year' });

            if (upsertErr) throw upsertErr;

            // 7. Update profiles (promote pending PF values)
            if (profileUpdates.length > 0) {
                // Supabase doesn't support batch update with different values easily in a single call without RPC, 
                // but we can do it in a loop for now or skip if list is small. 
                // For reliability, we'll use a single upsert if the schema allows ID-based upsert.
                const { error: profErr } = await supabase
                    .from('profiles')
                    .upsert(profileUpdates);
                if (profErr) console.warn('Failed to promote pending PF values:', profErr);
            }

            alert(`✅ Payroll generated for ${employees.length} employees (${monthYear}).`);
            fetchRecords(monthYear);

        } catch (err: any) {
            console.error('Payroll Gen Error:', err);
            setError(err.message || 'Failed to generate payroll.');
            alert('Failed to generate payroll: ' + (err.message || 'Unknown error.'));
        } finally {
            if (isMounted.current) setGenerating(false);
        }
    };

    const markAsPaid = async (payrollId: string) => {
        try {
            const { error: updateErr } = await supabase
                .from('payroll_records')
                .update({ status: 'Paid', paid_date: new Date().toISOString() })
                .eq('id', payrollId);
            if (updateErr) throw updateErr;
            if (targetMonthYear) fetchRecords(targetMonthYear);
        } catch (err: any) {
            alert('Failed to mark as paid: ' + err.message);
        }
    };

    return { records, loading, error, generating, fetchRecords, generatePayroll, markAsPaid };
};
