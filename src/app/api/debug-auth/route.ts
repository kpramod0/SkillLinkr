import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization') || 'MISSING';
    const hasBearer = authHeader.startsWith('Bearer ');
    const tokenLength = hasBearer ? authHeader.length - 7 : 0;

    // Attempt to validate token
    let userEmail = null;
    let error = null;

    if (hasBearer) {
        const token = authHeader.slice(7);
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data, error: authErr } = await supabase.auth.getUser();
            if (authErr) error = authErr.message;
            userEmail = data?.user?.email;
        } catch (e: any) {
            error = e.message;
        }
    }

    return NextResponse.json({
        header_received: authHeader !== 'MISSING',
        header_start: authHeader.substring(0, 15) + '...',
        token_length: tokenLength,
        user_email: userEmail,
        auth_error: error,
        env: {
            url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
    });
}
