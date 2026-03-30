-- Retrieve the trigger function code
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
