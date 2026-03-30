-- Check the default value for the full_name column
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'full_name';
