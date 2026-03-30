-- View policies on profiles
SELECT polname, polcmd, polpermissive, pg_get_expr(polqual, polrelid) AS using_expr, pg_get_expr(polwithcheck, polrelid) AS check_expr
FROM pg_policy
WHERE polrelid = 'public.profiles'::regclass;
