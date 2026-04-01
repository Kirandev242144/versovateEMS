-- Run this in your Supabase SQL Editor to create the new Checklists feature table

CREATE TABLE IF NOT EXISTS task_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted access for admins (matching existing policies)
CREATE POLICY "Admins can manage task checklists" ON task_checklists FOR ALL USING (true);
