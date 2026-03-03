import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log("Testing database connection to client table...");

    // Test if we can query country
    const { error: queryError } = await supabase.from('clients').select('country').limit(1);

    if (queryError && queryError.message.includes('country')) {
        console.log("Confirmed: 'country' column is missing from Supabase.");
        console.log("");
        console.log("=========================================================================");
        console.log("ACTION REQUIRED BY YOU (THE DEVELOPER):");
        console.log("Because you are using an Anon Key, this script cannot alter your tables.");
        console.log("Please go to https://supabase.com/dashboard/project/_/sql/new");
        console.log("And run this exact SQL:");
        console.log("");
        console.log("ALTER TABLE public.clients");
        console.log("ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',");
        console.log("ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';");
        console.log("");
        console.log("ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_id TEXT;");
        console.log("=========================================================================");
    } else if (!queryError) {
        console.log("Success! The 'country' column exists.");
    } else {
        console.log("Other error: ", queryError);
    }
}

checkDatabase();
