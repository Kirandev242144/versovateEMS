-- Run this in your Supabase SQL Editor to add cover images to Projects

ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image TEXT;
