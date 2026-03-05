-- ==============================================================================
-- VERSOVATE: Dynamic Profile Role Type Fixer
-- Safely alters profiles.role to TEXT by temporarily dropping ANY dependent RLS policies
-- ==============================================================================

DO $$
DECLARE
    pol RECORD;
    create_stmt TEXT;
BEGIN
    -- 1. Create a table to hold policies we are going to recreate
    CREATE TEMP TABLE IF NOT EXISTS temp_recreate_policies (
        table_name TEXT,
        policy_name TEXT,
        create_string TEXT
    );
    TRUNCATE temp_recreate_policies;

    -- 2. Find all policies that depend on the profiles.role column
    FOR pol IN
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            p.polname AS policy_name,
            p.polcmd AS cmd_type,
            p.polpermissive AS is_permissive,
            (SELECT array_agg(rl.rolname) FROM pg_roles rl WHERE rl.oid = ANY(p.polroles)) AS roles,
            pg_get_expr(p.polqual, p.polrelid) AS using_expr,
            pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND (
               pg_get_expr(p.polqual, p.polrelid) ILIKE '%role%'
            OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%role%'
          )
    LOOP
        -- Construct the CREATE POLICY statement
        create_stmt := format(
            'CREATE POLICY %I ON %I.%I AS %s FOR %s',
            pol.policy_name,
            pol.schema_name,
            pol.table_name,
            CASE WHEN pol.is_permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
            CASE pol.cmd_type
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
            END
        );

        IF pol.roles IS NOT NULL AND array_length(pol.roles, 1) > 0 THEN
            create_stmt := create_stmt || format(' TO %s', array_to_string(pol.roles, ', '));
        END IF;

        IF pol.using_expr IS NOT NULL THEN
            create_stmt := create_stmt || format(' USING (%s)', pol.using_expr);
        END IF;

        IF pol.check_expr IS NOT NULL THEN
            create_stmt := create_stmt || format(' WITH CHECK (%s)', pol.check_expr);
        END IF;

        -- Save to temp table for recreation
        INSERT INTO temp_recreate_policies (table_name, policy_name, create_string)
        VALUES (pol.table_name, pol.policy_name, create_stmt);

        -- Drop the policy so we can alter the column
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policy_name, pol.schema_name, pol.table_name);
    END LOOP;

    -- 3. Now we can safely remove constraints and alter the column!
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT;

    -- 4. Recreate all the dropped policies EXACTLY as they were
    FOR pol IN SELECT * FROM temp_recreate_policies LOOP
        EXECUTE pol.create_string;
    END LOOP;

    DROP TABLE temp_recreate_policies;
END $$;
