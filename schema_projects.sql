-- Projects table
create table projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  cover_image text,
  status text check (status in ('active', 'completed', 'on_hold', 'archived')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  start_date date,
  end_date date,
  admin_id uuid references auth.users(id) -- The admin who created it
);

-- Project members (link employees to projects)
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  employee_id uuid references profiles(id) on delete cascade,
  role text default 'Member', -- e.g., 'Lead', 'Member'
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (project_id, employee_id)
);

-- Kanban Tasks
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  description text,
  status text check (status in ('todo', 'in_progress', 'review', 'done')) default 'todo',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  assignee_id uuid references profiles(id) on delete set null,
  position integer not null default 0,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  due_date date
);

-- Task Checklists (Subtasks)
create table task_checklists (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table task_checklists enable row level security;

-- Policies (Simplified for now: admin can do everything)
create policy "Admins can manage projects" on projects for all using (true);
create policy "Admins can manage project members" on project_members for all using (true);

-- Granular Task Policies
create policy "Anyone can view tasks" on tasks for select using (true);
create policy "Users can insert tasks" on tasks for insert with check (true);
create policy "Users can update their own tasks" on tasks for update 
  using (auth.uid() = assignee_id OR exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (auth.uid() = assignee_id OR exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can delete their own tasks" on tasks for delete 
  using (auth.uid() = assignee_id OR exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can manage task checklists" on task_checklists for all using (true);
