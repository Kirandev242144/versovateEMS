import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRole(userId: string | undefined) {
    const [role, setRole] = useState<'admin' | 'employee' | null>(null);
    const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!userId) {
            setRole(null);
            setIsOnboarded(false);
            setLoading(false);
            return;
        }

        async function fetchRole(retryCount = 0) {
            try {
                if (retryCount === 0) setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, offer_letter_signed')
                    .eq('id', userId)
                    .maybeSingle();

                if (error) throw error;

                console.log(`[useRole] Fetch for ${userId} result:`, data);

                if (data?.role) {
                    setRole(data.role as 'admin' | 'employee');
                    setIsOnboarded(!!data.offer_letter_signed);
                    setLoading(false);
                } else if (retryCount < 2) {
                    // Retry once after 1s to allow for eventual consistency (e.g. triggers)
                    setTimeout(() => fetchRole(retryCount + 1), 1500);
                } else {
                    setRole(null);
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

    return { role, isOnboarded, loading, error };
}
