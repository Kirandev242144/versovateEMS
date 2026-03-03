import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface EmployeeProfile {
    id: string;
    email: string;
    full_name: string;
    fathers_name?: string;
    dob?: string;
    gender?: string;
    role: 'admin' | 'employee';
    department?: string;
    job_title?: string;
    phone?: string;
    address?: string;
    permanent_address?: string;
    employment_type?: string;
    work_model?: string;
    join_date?: string;
    exit_date?: string;
    salary_amount?: number;
    salary_currency?: string;
    bank_account_holder?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_pan?: string;
    bank_branch?: string;
    resume_url?: string;
    offer_letter_url?: string;
    joining_letter_url?: string;
    contract_url?: string;
    id_proof_url?: string;
    aadhaar_pan_url?: string;
    profile_pic_url?: string;
    custom_id?: string;
    personal_email?: string;
    aadhar_number?: string;
    pan_number?: string;
    qualification?: string;
    marital_status?: string;
    blood_group?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    status: 'Active' | 'On Leave' | 'Absent' | 'Terminated';
    work_days?: number[];
    epf_employee_percent?: number | null;
    epf_employer_percent?: number | null;
    pending_epf_employee?: number | null;
    pending_epf_employer?: number | null;
    epf_update_month?: string | null;
    created_at: string;
}

const calculateStats = (data: EmployeeProfile[]) => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    return {
        total: data.length,
        newThisMonth: data.filter(e => e.created_at >= firstOfMonth).length,
        active: data.filter(e => e.status === 'Active').length,
        onLeave: data.filter(e => e.status === 'On Leave').length
    };
};

const calculateDeptStats = (data: EmployeeProfile[]) => {
    const counts: Record<string, number> = {};
    data.forEach(emp => {
        const dept = emp.department || 'Unassigned';
        counts[dept] = (counts[dept] || 0) + 1;
    });

    const colors = ['#00BFA5', '#263238', '#4DB6AC', '#B2DFDB', '#80CBC4', '#E0F2F1', '#26A69A', '#004D40'];
    return Object.entries(counts).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
    })).sort((a, b) => b.value - a.value);
};

let globalEmployeesCache: EmployeeProfile[] | null = null;
let globalStatsCache: any = { total: 0, newThisMonth: 0, active: 0, onLeave: 0 };
let globalDeptStatsCache: any = [];
let isGlobalCacheLoaded = false;

export const useEmployees = () => {
    const [employees, setEmployees] = useState<EmployeeProfile[]>(globalEmployeesCache || []);
    const [loading, setLoading] = useState(!isGlobalCacheLoaded);
    const [initialLoadDone, setInitialLoadDone] = useState(isGlobalCacheLoaded);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState(globalStatsCache);
    const [deptStats, setDeptStats] = useState<{ name: string; value: number; color: string }[]>(globalDeptStatsCache);
    const isMounted = useRef(true);

    const fetchEmployees = useCallback(async (isBackground = false) => {
        if (!isMounted.current) return;
        if (!isBackground && !isGlobalCacheLoaded) {
            setLoading(true);
        }
        setError(null);

        try {
            const timeoutId = setTimeout(() => {
                if (loading && isMounted.current) {
                    setLoading(false);
                    setError('Connection is slow. Please check your internet or try refreshing.');
                }
            }, 15000);

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (!session) {
                clearTimeout(timeoutId);
                if (isMounted.current) {
                    setEmployees([]);
                    setLoading(false);
                }
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'employee');

            clearTimeout(timeoutId);

            if (fetchError) throw fetchError;

            const mappedData: EmployeeProfile[] = (data || []).map((p: any) => ({
                ...p,
                email: p.email || 'no-email@example.com',
                created_at: p.created_at || new Date().toISOString(),
                status: (p.status as any) || 'Active',
            }));

            const newStats = calculateStats(mappedData);
            const newDeptStats = calculateDeptStats(mappedData);

            if (isMounted.current) {
                setEmployees(mappedData);
                setStats(newStats);
                setDeptStats(newDeptStats);
            }

            // Update global cache so navigation is instant
            globalEmployeesCache = mappedData;
            globalStatsCache = newStats;
            globalDeptStatsCache = newDeptStats;
            isGlobalCacheLoaded = true;
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.log('[useEmployees] Request aborted safely.');
                return;
            }
            console.error('[useEmployees] Error:', err);
            if (isMounted.current) setError(err.message);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setInitialLoadDone(true);
            }
        }
    }, []);

    const deleteEmployee = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('profiles')
                .update({ status: 'Terminated' })
                .eq('id', id);

            if (deleteError) throw deleteError;
            await fetchEmployees();
        } catch (err: any) {
            console.error('Error deleting employee:', err);
            throw err;
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchEmployees(false);

        const handleRefresh = () => {
            console.log('[useEmployees] Auto-refreshing on window focus...');
            fetchEmployees(true);
        };
        window.addEventListener('versovate:refresh', handleRefresh);

        return () => {
            isMounted.current = false;
            window.removeEventListener('versovate:refresh', handleRefresh);
        };
    }, [fetchEmployees]);

    return {
        employees,
        loading,
        initialLoadDone,
        error,
        stats,
        deptStats,
        refresh: fetchEmployees,
        deleteEmployee
    };
};

export const useEmployee = (id: string | undefined) => {
    const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);
    // This flag is never reset - once loaded, background refresh never shows spinner
    const hasLoadedOnce = useRef(false);

    const fetchEmployee = useCallback(async (isBackground = false) => {
        if (!id || !isMounted.current) return;

        // Background refresh: NEVER show loading spinner if we've loaded before
        if (!isBackground || !hasLoadedOnce.current) {
            if (!hasLoadedOnce.current) {
                setLoading(true);
            }
        }
        setError(null);

        try {
            const timeoutId = setTimeout(() => {
                if (loading && isMounted.current) {
                    setLoading(false);
                    setError('Connection is slow. Please check your internet or try refreshing.');
                }
            }, 15000);

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            clearTimeout(timeoutId);

            if (fetchError) throw fetchError;

            if (!data) {
                throw new Error('Employee not found');
            }

            if (isMounted.current) {
                setEmployee({
                    ...data,
                    email: data.email || 'no-email@example.com',
                    created_at: data.created_at || new Date().toISOString(),
                    status: (data.status as any) || 'Active',
                });
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.log('[useEmployee] Request aborted safely.');
                // Don't touch loading state on abort
                return;
            }
            console.error('[useEmployee] Error:', err);
            if (isMounted.current) setError(err.message);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setInitialLoadDone(true);
                hasLoadedOnce.current = true;
            }
        }
    }, [id]);

    useEffect(() => {
        isMounted.current = true;
        fetchEmployee(false);

        const handleRefresh = () => {
            console.log('[useEmployee] Auto-refreshing on window focus...');
            fetchEmployee(true);
        };
        window.addEventListener('versovate:refresh', handleRefresh);

        return () => {
            isMounted.current = false;
            window.removeEventListener('versovate:refresh', handleRefresh);
        };
    }, [fetchEmployee]);

    return { employee, loading, initialLoadDone, error, refresh: fetchEmployee };
};

