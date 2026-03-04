import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface WeeklyStats {
    invoicedAmount: number;
    revenueAmount: number;
    newEmployees: number;
    attendanceRate: number;
    attendanceData: { day: string; attendance: number }[];
    loading: boolean;
    error: string | null;
}

export const useAdminDashboardStats = () => {
    const [stats, setStats] = useState<WeeklyStats>({
        invoicedAmount: 0,
        revenueAmount: 0,
        newEmployees: 0,
        attendanceRate: 0,
        attendanceData: [],
        loading: true,
        error: null,
    });

    const fetchStats = useCallback(async () => {
        try {
            setStats(prev => ({ ...prev, loading: true }));

            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(now);
            monday.setDate(now.getDate() - diffToMonday);
            monday.setHours(0, 0, 0, 0);

            const weekStartDate = monday.toISOString().split('T')[0];
            const weekStartISO = monday.toISOString();

            // 1. New Employees this week
            const { count: newEmployeesCount, error: empError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'employee')
                .gte('created_at', weekStartISO);

            if (empError) throw empError;

            // 2. Weekly Invoiced Amount
            const { data: invoices, error: invError } = await supabase
                .from('invoices')
                .select('total_amount, exchange_rate, total_inr_amount')
                .gte('issue_date', weekStartDate);

            if (invError) throw invError;

            let weeklyInvoiced = 0;
            invoices?.forEach(inv => {
                const rate = inv.exchange_rate || 1.0;
                weeklyInvoiced += inv.total_inr_amount || (inv.total_amount * rate);
            });

            // 3. Weekly Revenue (Payments collected this week)
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select('amount, invoices(exchange_rate)')
                .gte('payment_date', weekStartDate);

            if (payError) throw payError;

            const weeklyRevenue = payments?.reduce((sum, p: any) => sum + (p.amount * (p.invoices?.exchange_rate || 1.0)), 0) || 0;

            // 4. Weekly Attendance
            const { data: attendanceRecords, error: attError } = await supabase
                .from('weekly_attendance')
                .select('daily_breakdown')
                .eq('week_start_date', weekStartDate);

            if (attError) throw attError;

            const dailyStats: Record<string, { present: number; total: number }> = {
                'Mon': { present: 0, total: 0 },
                'Tue': { present: 0, total: 0 },
                'Wed': { present: 0, total: 0 },
                'Thu': { present: 0, total: 0 },
                'Fri': { present: 0, total: 0 },
            };

            attendanceRecords?.forEach(record => {
                record.daily_breakdown?.forEach((dayEntry: any) => {
                    if (dailyStats[dayEntry.day]) {
                        dailyStats[dayEntry.day].total++;
                        if (dayEntry.status === 'Present') {
                            dailyStats[dayEntry.day].present++;
                        }
                    }
                });
            });

            const attendanceData = Object.entries(dailyStats).map(([day, counts]) => ({
                day,
                attendance: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0
            }));

            const totalDaysStats = attendanceData.reduce((acc, curr) => ({
                total: acc.total + curr.attendance,
                count: acc.count + 1
            }), { total: 0, count: 0 });

            const avgAttendance = totalDaysStats.count > 0 ? Math.round(totalDaysStats.total / totalDaysStats.count) : 0;

            setStats({
                invoicedAmount: weeklyInvoiced,
                revenueAmount: weeklyRevenue,
                newEmployees: newEmployeesCount || 0,
                attendanceRate: avgAttendance,
                attendanceData,
                loading: false,
                error: null,
            });

        } catch (err: any) {
            console.error('Error fetching admin dashboard stats:', err);
            setStats(prev => ({ ...prev, loading: false, error: err.message }));
        }
    }, []);

    useEffect(() => {
        fetchStats();

        const handleRefresh = () => fetchStats();
        window.addEventListener('versovate:refresh', handleRefresh);
        return () => window.removeEventListener('versovate:refresh', handleRefresh);
    }, [fetchStats]);

    return { ...stats, refresh: fetchStats };
};
