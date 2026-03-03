import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface LeaveType {
    id: string;
    name: string;
    annual_quota: number;
    description: string;
    color: string;
}

export interface LeaveBalance {
    id: string;
    leave_type_id: string;
    year: number;
    total_days: number;
    used_days: number;
    remaining_days: number;
    leave_type: LeaveType;
}

export interface LeaveRequest {
    id: string;
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    is_half_day: boolean;
    half_day_period: 'morning' | 'afternoon' | null;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    admin_note: string | null;
    reviewed_at: string | null;
    created_at: string;
    leave_type?: LeaveType;
    employee?: {
        full_name: string;
        custom_id: string;
        department: string;
        profile_pic_url: string;
    };
}

// ─────────────────────────────────────────────────────────
// Hook: Leave Requests (for both employee & admin)
// ─────────────────────────────────────────────────────────
export const useLeaveRequests = (role: 'admin' | 'employee' | null) => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);
    const hasLoadedOnce = useRef(false);

    const fetchRequests = useCallback(async () => {
        if (!isMounted.current) return;
        if (!hasLoadedOnce.current) setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            let query = supabase
                .from('leave_requests')
                .select(`
                    *,
                    leave_type:leave_types(id, name, color, annual_quota),
                    employee:profiles!employee_id(full_name, custom_id, department, profile_pic_url)
                `)
                .order('created_at', { ascending: false });

            // Employees only see their own requests
            if (role === 'employee') {
                query = query.eq('employee_id', session.user.id);
            }

            const { data, error: fetchErr } = await query;
            if (fetchErr) throw fetchErr;
            if (isMounted.current) setRequests((data as LeaveRequest[]) || []);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
            console.error('[useLeaveRequests] Error:', err);
            if (isMounted.current) setError(err.message || 'Failed to load leave requests');
        } finally {
            if (isMounted.current) {
                setLoading(false);
                hasLoadedOnce.current = true;
            }
        }
    }, [role]);

    useEffect(() => {
        isMounted.current = true;
        if (role) fetchRequests();

        const handleRefresh = () => fetchRequests();
        window.addEventListener('versovate:refresh', handleRefresh);

        return () => {
            isMounted.current = false;
            window.removeEventListener('versovate:refresh', handleRefresh);
        };
    }, [fetchRequests, role]);

    return { requests, loading, error, refresh: fetchRequests };
};

// ─────────────────────────────────────────────────────────
// Hook: Leave Balance for current employee
// ─────────────────────────────────────────────────────────
export const useLeaveBalance = () => {
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);
    const hasLoadedOnce = useRef(false);

    const fetchBalances = useCallback(async () => {
        if (!isMounted.current) return;
        if (!hasLoadedOnce.current) setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            const currentYear = new Date().getFullYear();
            const { data, error: fetchErr } = await supabase
                .from('leave_balances')
                .select(`*, leave_type:leave_types(id, name, color, annual_quota, description)`)
                .eq('employee_id', session.user.id)
                .eq('year', currentYear);

            if (fetchErr) throw fetchErr;
            if (isMounted.current) setBalances((data as LeaveBalance[]) || []);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
            console.error('[useLeaveBalance] Error:', err);
            if (isMounted.current) setError(err.message || 'Failed to load leave balances');
        } finally {
            if (isMounted.current) {
                setLoading(false);
                hasLoadedOnce.current = true;
            }
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        fetchBalances();

        const handleRefresh = () => fetchBalances();
        window.addEventListener('versovate:refresh', handleRefresh);

        return () => {
            isMounted.current = false;
            window.removeEventListener('versovate:refresh', handleRefresh);
        };
    }, [fetchBalances]);

    return { balances, loading, error, refresh: fetchBalances };
};

// ─────────────────────────────────────────────────────────
// Hook: Leave Types
// ─────────────────────────────────────────────────────────
export const useLeaveTypes = () => {
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

    useEffect(() => {
        supabase.from('leave_types').select('*').order('name').then(({ data }) => {
            if (data) setLeaveTypes(data as LeaveType[]);
        });
    }, []);

    return { leaveTypes };
};

// ─────────────────────────────────────────────────────────
// Action: Submit leave request
// ─────────────────────────────────────────────────────────
export const submitLeaveRequest = async (payload: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    is_half_day: boolean;
    half_day_period?: 'morning' | 'afternoon';
    reason: string;
}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('leave_requests')
        .insert({ ...payload, employee_id: session.user.id, status: 'Pending' })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ─────────────────────────────────────────────────────────
// Action: Admin approve/reject
// ─────────────────────────────────────────────────────────
export const updateLeaveStatus = async (
    requestId: string,
    status: 'Approved' | 'Rejected',
    adminNote: string,
    employeeId: string,
    leaveTypeId: string,
    totalDays: number,
    // Extra fields needed for attendance sync
    startDate?: string,
    endDate?: string,
    isHalfDay?: boolean
) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // 1. Update the request status
    const { error: updateErr } = await supabase
        .from('leave_requests')
        .update({
            status,
            admin_note: adminNote || null,
            reviewed_by: session.user.id,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (updateErr) throw updateErr;

    if (status === 'Approved') {
        const currentYear = new Date().getFullYear();

        // 2. Update leave balance (increment used_days)
        // First fetch current balance, then increment
        const { data: balData } = await supabase
            .from('leave_balances')
            .select('id, used_days')
            .eq('employee_id', employeeId)
            .eq('leave_type_id', leaveTypeId)
            .eq('year', currentYear)
            .maybeSingle();

        if (balData) {
            await supabase
                .from('leave_balances')
                .update({ used_days: balData.used_days + totalDays })
                .eq('id', balData.id);
        }

        // 3. Auto-mark attendance for the approved leave dates
        if (startDate && endDate) {
            const { error: rpcErr } = await supabase.rpc('mark_leave_in_attendance', {
                p_employee_id: employeeId,
                p_start_date: startDate,
                p_end_date: endDate,
                p_is_half_day: isHalfDay ?? false
            });

            if (rpcErr) {
                // Non-fatal: log but don't block the approval
                console.warn('[updateLeaveStatus] Attendance sync failed (non-fatal):', rpcErr.message);
            } else {
                console.log('[updateLeaveStatus] ✅ Attendance auto-marked as Leave for approved dates.');
            }
        }
    }
};


// ─────────────────────────────────────────────────────────
// Action: Employee cancel a pending request
// ─────────────────────────────────────────────────────────
export const cancelLeaveRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)
        .eq('status', 'Pending');

    if (error) throw error;
};
