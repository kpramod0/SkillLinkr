import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const checks: any = {
        env: {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            SUPABASE_SERVICE_ROLE_KEY_LEN: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        },
        adminClient: {
            exists: !!supabaseAdmin,
            hasFrom: typeof supabaseAdmin?.from === 'function',
        }
    };

    try {
        // Try creating a client manually
        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error } = await sb.from('profiles').select('count').limit(1).single();
        checks.connection = { success: !error, error: error?.message, data };
    } catch (e: any) {
        checks.connection = { success: false, error: e.message };
    }

    return NextResponse.json(checks);
}
