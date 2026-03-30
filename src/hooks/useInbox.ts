import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface InboxThread {
    id: string;
    subject: string;
    snippet: string;
    last_message_at: string;
    is_archived: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    messages?: InboxMessage[];
    labels?: InboxLabel[];
}

export interface InboxMessage {
    id: string;
    thread_id: string;
    sender_email: string;
    sender_name: string;
    to_email: string;
    subject: string;
    body_html?: string;
    body_text: string;
    is_read: boolean;
    is_starred: boolean;
    is_sent: boolean;
    is_trash: boolean;
    created_at: string;
}

export interface InboxLabel {
    id: string;
    name: string;
    color: string;
}

export const useInbox = () => {
    const [threads, setThreads] = useState<InboxThread[]>([]);
    const [labels, setLabels] = useState<InboxLabel[]>([]);
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'archive' | 'trash'>('inbox');
    const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Use a ref to track current threads length without triggering re-fetch
    const threadsCountRef = useRef(0);

    const fetchLabels = useCallback(async () => {
        const { data, error } = await supabase
            .from('inbox_labels')
            .select('*')
            .order('name');
        if (!error && data) setLabels(data);
    }, []);

    const fetchThreads = useCallback(async () => {
        try {
            if (threadsCountRef.current === 0) setIsLoading(true);
            else setIsRefreshing(true);

            // 1. Fetch labels mapping
            const { data: labelMap } = await supabase.from('inbox_message_labels').select('*, inbox_labels(*)');

            // 2. Build Query
            let query = supabase.from('inbox_threads').select(`
        *,
        messages:inbox_messages(*)
      `).order('last_message_at', { ascending: false });

            if (activeTab === 'inbox' && !selectedLabelId) {
                query = query.eq('is_archived', false).eq('is_deleted', false);
            } else if (activeTab === 'archive') {
                query = query.eq('is_archived', true).eq('is_deleted', false);
            } else if (activeTab === 'trash') {
                query = query.eq('is_deleted', true);
            } else if (activeTab === 'sent') {
                query = query.eq('is_deleted', false);
            }

            const { data: threadData, error } = await query;
            if (error) throw error;

            // 3. Process data
            let processed = (threadData || []).map(t => {
                const threadMessages = (t.messages || []) as InboxMessage[];
                const threadLabels = (labelMap || [])
                    .filter(lm => threadMessages.some(m => m.id === lm.message_id))
                    .map(lm => lm.inbox_labels)
                    .filter(Boolean) as InboxLabel[];

                return {
                    ...t,
                    messages: threadMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
                    labels: threadLabels
                };
            });

            if (selectedLabelId) {
                processed = processed.filter(t => t.labels?.some(l => l.id === selectedLabelId));
            }

            if (activeTab === 'sent') {
                processed = processed.filter(t => t.messages?.some(m => m.is_sent));
            } else if (activeTab === 'inbox') {
                processed = processed.filter(t => !t.messages?.some(m => m.is_sent) || t.messages.length > 1);
            }

            setThreads(processed);
            threadsCountRef.current = processed.length;

            // 4. Update Unread Count
            const unread = processed.filter(t => t.messages?.some(m => !m.is_read && !m.is_sent)).length;
            setUnreadCount(unread);

        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [activeTab, selectedLabelId]);

    const createLabel = async (name: string, color: string) => {
        const { error } = await supabase.from('inbox_labels').insert({ name, color });
        if (!error) fetchLabels();
    };

    const deleteLabel = async (id: string) => {
        const { error } = await supabase.from('inbox_labels').delete().eq('id', id);
        if (!error) fetchLabels();
    };

    const archiveThread = async (id: string, isArchived: boolean = true) => {
        await supabase.from('inbox_threads').update({ is_archived: isArchived }).eq('id', id);
        fetchThreads();
    };

    const deleteThread = async (id: string, isDeleted: boolean = true) => {
        await supabase.from('inbox_threads').update({ is_deleted: isDeleted }).eq('id', id);
        fetchThreads();
    };

    const addMessageLabel = async (messageId: string, labelId: string) => {
        await supabase.from('inbox_message_labels').insert({ message_id: messageId, label_id: labelId });
        fetchThreads();
    };

    const removeMessageLabel = async (messageId: string, labelId: string) => {
        await supabase.from('inbox_message_labels').delete().eq('message_id', messageId).eq('label_id', labelId);
        fetchThreads();
    };

    const markAsRead = async (id: string) => {
        await supabase.from('inbox_messages').update({ is_read: true }).eq('thread_id', id).eq('is_read', false);
    };

    const sendReply = async (threadId: string, body: string) => {
        const thread = threads.find(t => t.id === threadId);
        if (!thread || !thread.messages) return false;

        const lastMsg = thread.messages[thread.messages.length - 1];

        const { error } = await supabase.from('inbox_messages').insert({
            thread_id: threadId,
            sender_email: 'kiranironhide.ironhide@gmail.com',
            sender_name: 'Versovate User',
            to_email: lastMsg?.sender_email || '',
            subject: `Re: ${thread.subject}`,
            body_text: body,
            is_sent: true,
            is_read: true
        });

        if (!error) {
            await supabase.from('inbox_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
            fetchThreads();
            return true;
        }
        return false;
    };

    const composeMessage = async (to: string, subject: string, body: string) => {
        const { data: thread, error: tErr } = await supabase
            .from('inbox_threads')
            .insert({ subject, snippet: body.substring(0, 100) })
            .select().single();

        if (tErr) return false;

        const { error: mErr } = await supabase.from('inbox_messages').insert({
            thread_id: thread.id,
            sender_email: 'kiranironhide.ironhide@gmail.com',
            sender_name: 'Versovate User',
            to_email: to,
            subject,
            body_text: body,
            is_sent: true,
            is_read: true
        });

        if (!mErr) {
            fetchThreads();
            return true;
        }
        return false;
    };

    useEffect(() => {
        fetchLabels();
        fetchThreads();

        const sub = supabase.channel('inbox_realtime_final')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_messages' }, () => fetchThreads())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_threads' }, () => fetchThreads())
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [fetchLabels, fetchThreads]);

    return {
        threads,
        labels,
        activeTab,
        setActiveTab,
        selectedLabelId,
        setSelectedLabelId,
        isLoading,
        isRefreshing,
        unreadCount,
        fetchThreads,
        createLabel,
        deleteLabel,
        addMessageLabel,
        removeMessageLabel,
        archiveThread,
        deleteThread,
        markAsRead,
        sendReply,
        composeMessage
    };
};
