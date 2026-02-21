import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseServiceRoleKey) {
    // On server startup, emit a clear warning. This will appear in Vercel logs.
    console.error(
        '[supabase-admin] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Falling back to ANON key — RLS policies WILL block team_members and other protected tables. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY in your Vercel environment variables.'
    );
}

// Use service role key if available; fall back to anon ONLY for build-time (no real queries then)
const keyToUse = supabaseServiceRoleKey || supabaseAnonKey;

export const supabaseAdmin = (supabaseUrl && keyToUse)
    ? createClient(supabaseUrl, keyToUse, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : {} as any;
