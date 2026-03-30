-- ============================================================
-- VERSOVATE: Recruitment & Jobs Schema
-- ============================================================

-- 1. Job Openings
CREATE TABLE IF NOT EXISTS job_openings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT DEFAULT 'Remote',
    type TEXT DEFAULT 'Full-time', -- Full-time, Part-time, Contract
    status TEXT DEFAULT 'open', -- open, closed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES job_openings(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT, -- Path to Supabase Storage or external link
    portfolio_link TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, reviewed, shortlisted, rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- 1. Job Openings: Public can READ, Admins can manage
CREATE POLICY "Anyone can view open jobs" ON job_openings
    FOR SELECT USING (status = 'open');

CREATE POLICY "Admins can manage job openings" ON job_openings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- 2. Job Applications: Public can INSERT, Admins can manage
CREATE POLICY "Anyone can apply for a job" ON job_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage job applications" ON job_applications
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- Seeding Default Jobs (Based on user screenshot)
-- ============================================================
INSERT INTO job_openings (title, description, location, type) VALUES
    ('Android Developer', 'Build cutting-edge Android applications that power seamless digital experiences. Collaborate with designers and backend teams to deliver high-performance mobile solutions.', 'On-site', 'Full-time'),
    ('Software Engineer', 'Design, develop, and optimize software systems that push boundaries. Tackle complex problems and bring ideas to life with clean, efficient code.', 'On-site', 'Full-time'),
    ('UI/UX Designer', 'Craft intuitive interfaces and delightful user journeys. Your creativity will shape how people interact with our products.', 'On-site', 'Full-time')
ON CONFLICT DO NOTHING;
