-- Seed some projects
insert into projects (name, description, status, start_date, end_date) values
('Q2 Recruitment Drive', 'Scaling the engineering team for the upcoming product launch.', 'active', '2026-04-01', '2026-06-30'),
('Versovate Brand Refresh', 'Modernizing the visual identity and website design.', 'active', '2026-03-15', '2026-05-15'),
('Employee Handbook v2', 'Updating policies and benefits documentation.', 'completed', '2026-02-01', '2026-03-01');

-- Add some tasks to 'Q2 Recruitment Drive' (assuming first project ID is fetched)
-- I'll use subqueries if needed, but for manual SQL injection the user will do it.
-- Let's just provide the structure for tasks in the first project.

-- insert into tasks (project_id, title, description, status, priority, position)
-- select id, 'Source React Developers', 'Reach out to 50+ candidates on LinkedIn', 'todo', 'high', 0 from projects where name = 'Q2 Recruitment Drive';
-- select id, 'Technical Interviews', 'Schedule rounds for top 5 candidates', 'in_progress', 'urgent', 0 from projects where name = 'Q2 Recruitment Drive';
-- select id, 'Offer Extensions', 'Finalize packages and send for approval', 'review', 'medium', 0 from projects where name = 'Q2 Recruitment Drive';
