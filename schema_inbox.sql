-- ============================================================
-- VERSOVATE: Inbox & Messaging Schema
-- Run this script in Supabase SQL Editor
-- ============================================================

-- 1. Inbox Threads
CREATE TABLE IF NOT EXISTS inbox_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT DEFAULT '(No Subject)',
    snippet TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inbox Messages
CREATE TABLE IF NOT EXISTS inbox_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    is_trash BOOLEAN DEFAULT FALSE,
    external_id TEXT, -- ID from Postmark/SendGrid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inbox Labels
CREATE TABLE IF NOT EXISTS inbox_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#E5E7EB',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Message Labels Mapping
CREATE TABLE IF NOT EXISTS inbox_message_labels (
    message_id UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES inbox_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (message_id, label_id)
);

-- Seed default labels
INSERT INTO inbox_labels (name, color) VALUES
    ('HR', '#6E40FF'),
    ('Leave Requests', '#10B981'),
    ('Interview', '#3B82F6'),
    ('Admin Notes', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_message_labels ENABLE ROW LEVEL SECURITY;

-- For now, all admins can manage the shared HR Inbox
CREATE POLICY "Admins can manage inbox threads" ON inbox_threads FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage inbox messages" ON inbox_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage labels" ON inbox_labels FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage message labels" ON inbox_message_labels FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Function to update thread details on new message
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inbox_threads
    SET 
        last_message_at = NEW.created_at,
        snippet = LEFT(COALESCE(NEW.body_text, ''), 100),
        updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_on_message
    AFTER INSERT ON inbox_messages
    FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();
