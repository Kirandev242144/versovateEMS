-- Run this in your Supabase SQL Editor to add the missing progress column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
