-- Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT NOT NULL, -- 'Recruitment', 'Interview', 'Onboarding', etc.
    all_day BOOLEAN DEFAULT false,
    color TEXT,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can do everything on calendar_events" 
ON public.calendar_events
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Sample Data for June 2035 (as per Figma)
INSERT INTO public.calendar_events (title, description, start_time, end_time, category, color)
VALUES 
('Onboarding Session - New Hires Batch 3', 'Welcome new team members', '2035-06-01 10:00:00+00', '2035-06-01 12:00:00+00', 'Onboarding', '#00BFA5'),
('Interview - Product Designer', 'Candidate: John Smith', '2035-06-05 09:00:00+00', '2035-06-05 10:00:00+00', 'Interview', '#6232FF'),
('Quarterly Policy Review', 'Annual policy update meeting', '2035-06-05 15:00:00+00', '2035-06-05 16:30:00+00', 'Recruitment', '#FF9F1C'),
('Team Communication Workshop', 'Soft skills training', '2035-06-07 14:00:00+00', '2035-06-07 16:00:00+00', 'Employee Development', '#6C5DD3'),
('Recruitment Planning - Q3 Targets', 'Strategy meeting', '2035-06-15 11:00:00+00', '2035-06-15 12:30:00+00', 'Recruitment', '#FF9F1C'),
('New Recruit Introduction', 'Meet and greet', '2035-06-21 09:00:00+00', '2035-06-21 10:00:00+00', 'Talent Acquisition', '#00BFA5'),
('Personal Growth Session', '1-on-1 coaching', '2035-06-21 14:00:00+00', '2035-06-21 15:00:00+00', 'Employee Development', '#6C5DD3'),
('Upskilling Program: Advanced Excel', 'Final assessment', '2035-06-22 15:30:00+00', '2035-06-22 17:00:00+00', 'Employee Development', '#6C5DD3');
