import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse App Script JSON
        const payload = await req.json()
        console.log('Received Inbound Payload:', payload)

        const {
            sender_email,
            sender_name,
            recipient_email,
            subject,
            body_text,
            body_html,
            message_id: external_id
        } = payload

        // 1. Thread Management
        // Find an existing thread with the same subject
        let { data: thread } = await supabaseClient
            .from('inbox_threads')
            .select('id')
            .eq('subject', subject)
            .eq('is_archived', false)
            .eq('is_deleted', false)
            .maybeSingle()

        if (!thread) {
            const { data: newThread, error: threadErr } = await supabaseClient
                .from('inbox_threads')
                .insert({ subject, snippet: body_text?.substring(0, 100) })
                .select()
                .single()

            if (threadErr) throw threadErr
            thread = newThread
        }

        // 2. Insert Message
        const { error: msgErr } = await supabaseClient
            .from('inbox_messages')
            .insert({
                thread_id: thread.id,
                sender_email,
                sender_name,
                recipient_email,
                subject,
                body_text,
                body_html,
                external_id,
                is_read: false
            })

        if (msgErr) throw msgErr

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error processing inbound email:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
