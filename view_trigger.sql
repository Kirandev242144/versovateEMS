-- Query the trigger function
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.proname = 'handle_new_user';
