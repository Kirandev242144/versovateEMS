-- 1. Create the Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add role_id to profiles (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role_id') THEN
        ALTER TABLE public.profiles ADD COLUMN role_id UUID REFERENCES public.roles(id);
    END IF;
END $$;

-- 3. Insert default system roles
INSERT INTO public.roles (name, permissions)
VALUES 
    ('admin', '{"all": true}'::jsonb),
    ('employee', '{"dashboard": true, "attendance": true, "payslips": true, "leaves": true, "profile": true}'::jsonb)
ON CONFLICT (name) DO UPDATE 
SET permissions = EXCLUDED.permissions;

-- 4. Map existing string roles to UUID roles in profiles
DO $$
DECLARE
    admin_id UUID;
    employee_id UUID;
BEGIN
    SELECT id INTO admin_id FROM public.roles WHERE name = 'admin';
    SELECT id INTO employee_id FROM public.roles WHERE name = 'employee';

    -- Update profiles where role column matches string
    UPDATE public.profiles SET role_id = admin_id WHERE role = 'admin' AND role_id IS NULL;
    UPDATE public.profiles SET role_id = employee_id WHERE role = 'employee' AND role_id IS NULL;
END $$;

-- 5. Enable RLS on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 6. Policies for roles
-- Super Admin (admin role) can manage all roles
CREATE POLICY "Super Admins can manage roles" ON public.roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- All authenticated users can view roles (to see their own permissions or for selection)
CREATE POLICY "Authenticated users can view roles" ON public.roles
    FOR SELECT
    USING (auth.role() = 'authenticated');
