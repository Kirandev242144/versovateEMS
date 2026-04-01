-- ==============================================================================
-- VERSOVATE: Dummy Data Seeding Script (Projects & Tasks)
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Insert Dummy Projects
-- We use a subquery to fetch the first available profile as the admin_id
-- If no profile exists, admin_id will be NULL
INSERT INTO projects (name, description, status, start_date, end_date, admin_id)
VALUES 
(
  'Nexus Platform Migration', 
  'Upgrading core infrastructure to support high-concurrency real-time updates and improved scalability across regions.', 
  'active', 
  CURRENT_DATE, 
  CURRENT_DATE + INTERVAL '90 days',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
),
(
  'Q3 Marketing Analytics', 
  'Developing an interactive dashboard for regional marketing performance metrics, integrating multi-channel data sources.', 
  'active', 
  CURRENT_DATE - INTERVAL '15 days', 
  CURRENT_DATE + INTERVAL '45 days',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
),
(
  'Security Compliance Audit', 
  'Annual internal review of data privacy protocols, access control systems, and regulatory compliance standards.', 
  'on_hold', 
  CURRENT_DATE + INTERVAL '30 days', 
  CURRENT_DATE + INTERVAL '60 days',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- 2. Insert Dummy Tasks
-- We'll use subqueries to link tasks to the projects we just created

-- Tasks for 'Nexus Platform Migration'
INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Audit Current database indexes', 'Review performance bottlenecks in the primary PostgreSQL cluster.', 'todo', 'high', 0, 0, CURRENT_DATE + INTERVAL '7 days'
FROM projects WHERE name = 'Nexus Platform Migration' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Implement Redis caching layer', 'Deploy dedicated Redis instance for session management and API response caching.', 'in_progress', 'high', 1, 35, CURRENT_DATE + INTERVAL '14 days'
FROM projects WHERE name = 'Nexus Platform Migration' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Stress test API endpoints', 'Run Jmeter/Locust simulations for 10k concurrent users.', 'todo', 'medium', 2, 0, CURRENT_DATE + INTERVAL '21 days'
FROM projects WHERE name = 'Nexus Platform Migration' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date, assignee_id)
SELECT id, 'Documentation for migration path', 'Draft a technical runbook for the production cutover.', 'todo', 'low', 3, 0, CURRENT_DATE + INTERVAL '30 days', (SELECT id FROM profiles LIMIT 1)
FROM projects WHERE name = 'Nexus Platform Migration' LIMIT 1;


-- Tasks for 'Q3 Marketing Analytics'
INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Design UI mockups in Figma', 'Create high-fidelity prototypes for the analytics dashboard widgets.', 'done', 'medium', 0, 100, CURRENT_DATE - INTERVAL '5 days'
FROM projects WHERE name = 'Q3 Marketing Analytics' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Integrate Google Analytics API', 'Configure OAuth2 flow and verify data ingestion pipelines.', 'in_progress', 'high', 1, 60, CURRENT_DATE + INTERVAL '10 days'
FROM projects WHERE name = 'Q3 Marketing Analytics' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Build data visualization components', 'Develop reusable Chart.js/D3 components for regional trends.', 'todo', 'medium', 2, 0, CURRENT_DATE + INTERVAL '20 days'
FROM projects WHERE name = 'Q3 Marketing Analytics' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date, assignee_id)
SELECT id, 'User Testing Session', 'Gather feedback from the regional marketing leads on the initial preview.', 'review', 'medium', 3, 80, CURRENT_DATE + INTERVAL '15 days', (SELECT id FROM profiles LIMIT 1)
FROM projects WHERE name = 'Q3 Marketing Analytics' LIMIT 1;


-- Tasks for 'Security Compliance Audit'
INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Review employee access logs', 'Generate a report of all system access for the past 12 months.', 'todo', 'urgent', 0, 0, CURRENT_DATE + INTERVAL '40 days'
FROM projects WHERE name = 'Security Compliance Audit' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Update password rotation policy', 'Enforce 90-day expiry and multi-factor authentication for all admins.', 'todo', 'high', 1, 0, CURRENT_DATE + INTERVAL '45 days'
FROM projects WHERE name = 'Security Compliance Audit' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Conduct internal phishing simulation', 'Launch a controlled test to assess employee security awareness.', 'todo', 'medium', 2, 0, CURRENT_DATE + INTERVAL '50 days'
FROM projects WHERE name = 'Security Compliance Audit' LIMIT 1;

INSERT INTO tasks (project_id, title, description, status, priority, position, progress, due_date)
SELECT id, 'Patch legacy modules', 'Apply critical updates to legacy payroll and leave management services.', 'todo', 'urgent', 3, 0, CURRENT_DATE + INTERVAL '55 days'
FROM projects WHERE name = 'Security Compliance Audit' LIMIT 1;
