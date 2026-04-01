-- File Manager Schema

-- 1. Create Storage Bucket (if not exists)
-- Note: Some Supabase setups might prevent bucket creation via SQL.
-- If this fails, please create a bucket named 'file-manager' in the Supabase Dashboard.
insert into storage.buckets (id, name, public)
values ('file-manager', 'file-manager', true)
on conflict (id) do nothing;

-- 2. Create file_manager_files table to store metadata
create table if not exists file_manager_files (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  storage_path text not null,
  size bigint not null,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  is_folder boolean default false,
  parent_id uuid references file_manager_files(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table file_manager_files enable row level security;

-- 4. Create RLS Policies

-- Public/Select: Allow all authenticated users to view files (to share if needed, or stick to admins only)
-- For now, let's keep it Admin only for safety as requested "where admin can upload and manage"
create policy "Admins can view all files"
  on file_manager_files for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert files"
  on file_manager_files for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update files"
  on file_manager_files for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete files"
  on file_manager_files for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 5. Storage Policies for 'file-manager' bucket
-- Note: Replace 'file-manager' if the bucket ID is different.
create policy "Admin File Manager Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'file-manager' AND
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin File Manager View"
  on storage.objects for select
  using (
    bucket_id = 'file-manager' AND
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin File Manager Update"
  on storage.objects for update
  using (
    bucket_id = 'file-manager' AND
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin File Manager Delete"
  on storage.objects for delete
  using (
    bucket_id = 'file-manager' AND
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
