-- Add RLS policy so users can read their own profiles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    CREATE POLICY "Users can read own profile" ON public.profiles
        FOR SELECT
        USING (auth.uid() = id);
END $$;
