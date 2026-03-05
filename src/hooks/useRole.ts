import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Permissions {
    all?: boolean;
    dashboard?: boolean;
    attendance?: boolean;
    employees?: boolean;
    payroll?: boolean;
    leaves?: boolean;
    departments?: boolean;
    billing?: boolean;
    settings?: boolean;
    [key: string]: boolean | undefined;
}

export function useRole(userId: string | undefined) {
    const [role, setRole] = useState<'admin' | 'employee' | string | null>(null);
    const [permissions, setPermissions] = useState<Permissions | null>(null);
    const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!userId) {
            setRole(null);
            setPermissions(null);
            setIsOnboarded(false);
            setLoading(false);
            return;
        }

        async function fetchRole(retryCount = 0) {
            try {
                if (retryCount === 0) setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, offer_letter_signed, roles!profiles_role_id_fkey(name, permissions)')
                    .eq('id', userId)
                    .maybeSingle();

                if (error) throw error;

                console.log(`[useRole] Fetch for ${userId} result:`, data);

                if (data) {
                    // Fallback to the string 'role' if role_id/roles join is not set up correctly yet
                    const roleName = (data.roles as any)?.name || data.role;

                    // Default permissions if join fails
                    const defaultPerms = data.role === 'admin'
                        ? { all: true }
                        : { dashboard: true, attendance: true, leaves: true, payroll: true, profile: true };

                    const perms = (data.roles as any)?.permissions || defaultPerms;

                    setRole(roleName);
                    setPermissions(perms);
                    setIsOnboarded(!!data.offer_letter_signed);
                    setLoading(false);
                } else if (retryCount < 2) {
                    setTimeout(() => fetchRole(retryCount + 1), 1500);
                } else {
                    setRole(null);
                    setPermissions(null);
                    setIsOnboarded(false);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error fetching role:', err);
                setError(err);
                setLoading(false);
            }
        }

        fetchRole();
    }, [userId]);

    return { role, permissions, isOnboarded, loading, error };
}
