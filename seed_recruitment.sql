-- ============================================================
-- VERSOVATE: Recruitment Seed Data
-- Run this in Supabase SQL Editor
-- ============================================================

-- Function to get job_id by title
DO $$
DECLARE
    android_id UUID;
    software_id UUID;
    design_id UUID;
BEGIN
    SELECT id INTO android_id FROM job_openings WHERE title = 'Android Developer' LIMIT 1;
    SELECT id INTO software_id FROM job_openings WHERE title = 'Software Engineer' LIMIT 1;
    SELECT id INTO design_id FROM job_openings WHERE title = 'UI/UX Designer' LIMIT 1;

    -- 1. Android Developer Applicants
    INSERT INTO job_applications (job_id, full_name, email, phone, resume_url, portfolio_link, notes, status) VALUES
        (android_id, 'Kiran Dev', 'kiran.dev@example.com', '+91 98765 43210', 'https://example.com/resumes/kiran.pdf', 'https://github.com/kirandev', 'Expert in Kotlin and Jetpack Compose. 5 years of experience.', 'shortlisted'),
        (android_id, 'Sarah Jenkins', 'sarah.j@example.com', '+1 555-0123', 'https://example.com/resumes/sarah.pdf', 'https://sarahdesign.io', 'Previously at Google. Expert in Material Design.', 'reviewed');

    -- 2. Software Engineer Applicants
    INSERT INTO job_applications (job_id, full_name, email, phone, resume_url, portfolio_link, notes, status) VALUES
        (software_id, 'Alex Rivera', 'alex.r@example.com', '+1 555-9876', 'https://example.com/resumes/alex.pdf', 'https://alexcodes.dev', 'Full-stack developer with strong React and Node.js skills.', 'pending'),
        (software_id, 'James Wilson', 'james.w@tech.com', '+44 20 7946 0123', 'https://example.com/resumes/james.pdf', NULL, 'Backend specialist. Expert in Go and PostgreSQL.', 'rejected');

    -- 3. UI/UX Designer Applicants
    INSERT INTO job_applications (job_id, full_name, email, phone, resume_url, portfolio_link, notes, status) VALUES
        (design_id, 'Elena Rodriguez', 'elena.r@design.com', '+34 912 345 678', 'https://example.com/resumes/elena.pdf', 'https://behance.net/elena-r', 'Specializes in mobile-first design systems and accessibility.', 'shortlisted');

END $$;
