import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface WeeklyAttendance {
    id: string;
    employee_id: string;
    week_start_date: string;
    week_end_date: string;
    days_present: number;
    days_lop: number; // Maps to Absent
    days_paid_leave: number;
    days_holiday: number;
    daily_breakdown: {
        date: string;
        day: string;
        status: 'Present' | 'Absent' | 'Leave' | 'Holiday';
    }[];
    status: 'Pending' | 'Approved' | 'Rejected';
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    profile?: {
        full_name: string;
        email: string;
        custom_id: string;
        profile_pic_url: string;
        department: string;
    };
}

export const useAttendance = () => {
    const [records, setRecords] = useState<WeeklyAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<{ role: string; work_days: number[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);
    // Never reset this ref - once loaded, background refresh never shows spinner
    const hasLoadedOnce = useRef(false);

    const fetchAttendance = useCallback(async (retryCount = 0) => {
        if (!isMounted.current) return;
        // Only show spinner if we haven't loaded before
        if (!hasLoadedOnce.current && retryCount === 0) setLoading(true);
        setError(null);

        try {
            const timeoutId = setTimeout(() => {
                if (loading && isMounted.current) {
                    setLoading(false);
                    setError('Connection is slow. Please check your internet or try refreshing.');
                }
            }, 15000);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                clearTimeout(timeoutId);
                if (isMounted.current) {
                    setRecords([]);
                    setLoading(false);
                }
                return;
            }


            const { data: profile } = await supabase
                .from('profiles')
                .select('role, work_days')
                .eq('id', session.user.id)
                .single();

            if (isMounted.current) {
                setUserProfile({
                    role: profile?.role || 'employee',
                    work_days: profile?.work_days || [1, 2, 3, 4, 5]
                });
            }

            const isEmployee = profile?.role === 'employee';

            let query = supabase
                .from('weekly_attendance')
                .select(`
                    *,
                    profile:profiles(full_name, email, custom_id, profile_pic_url, department)
                `)
                .order('week_start_date', { ascending: false });

            // If employee, only see their own records. If admin, see all.
            if (isEmployee) {
                query = query.eq('employee_id', session.user.id);
            }

            const { data, error: fetchError }: any = await query;
            clearTimeout(timeoutId);

            if (fetchError) throw fetchError;

            if (isMounted.current) {
                setRecords(data || []);
                setError(null);
            }
        } catch (err: any) {
            // SILENTLY handle AbortError - just stop loading
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.log('[useAttendance] Request aborted safely.');
                return;
            }

            console.error('[useAttendance] Error:', err);

            if (retryCount < 2) { // Reduced retry count to be less aggressive
                setTimeout(() => {
                    if (isMounted.current) fetchAttendance(retryCount + 1);
                }, 4000);
            } else {
                if (isMounted.current) setError(err.message || 'Failed to load attendance');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                hasLoadedOnce.current = true;
            }
        }
    }, [isMounted]);

    useEffect(() => {
        isMounted.current = true;
        fetchAttendance();

        // Focus / Visibility refresh listener
        const handleRefresh = () => {
            console.log('[useAttendance] Auto-refreshing on window focus...');
            fetchAttendance(0);
        };
        window.addEventListener('versovate:refresh', handleRefresh);

        // Realtime Subscription
        const channel = supabase.channel('attendance-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_attendance' }, () => {
                fetchAttendance(0);
            })
            .subscribe();

        return () => {
            isMounted.current = false;
            window.removeEventListener('versovate:refresh', handleRefresh);
            supabase.removeChannel(channel);
        };
    }, [fetchAttendance]);

    const submitAttendance = async (payload: Partial<WeeklyAttendance>) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not logged in');

        const { data, error } = await supabase
            .from('weekly_attendance')
            .insert({
                employee_id: session.user.id,
                week_start_date: payload.week_start_date,
                week_end_date: payload.week_end_date,
                days_present: payload.days_present,
                days_lop: payload.days_lop,
                days_paid_leave: payload.days_paid_leave,
                days_holiday: payload.days_holiday,
                daily_breakdown: payload.daily_breakdown
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    };

    const updateAttendanceStatus = async (id: string, status: 'Approved' | 'Rejected', notes: string, updatedStats?: any) => {
        const payload: any = { status, admin_notes: notes };
        if (updatedStats) {
            payload.daily_breakdown = updatedStats.daily_breakdown;
            payload.days_present = updatedStats.days_present;
            payload.days_lop = updatedStats.days_lop;
            payload.days_paid_leave = updatedStats.days_paid_leave;
            payload.days_holiday = updatedStats.days_holiday;
        }

        const { error } = await supabase
            .from('weekly_attendance')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
        // The realtime subscription will auto-fetch the list
    };


    return {
        records,
        loading,
        error,
        userProfile,
        refresh: () => fetchAttendance(),
        submitAttendance,
        updateAttendanceStatus
    };
};
