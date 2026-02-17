
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

// GET /api/user/block?userId=...
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { data, error } = await getSupabase()
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data.map((b: any) => b.blocked_id));
}

// POST /api/user/block
export async function POST(req: Request) {
    try {
        const { blockerId, blockedId } = await req.json();

        if (!blockerId || !blockedId) {
            return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        }

        const { error } = await getSupabase()
            .from('blocked_users')
            .insert({ blocker_id: blockerId, blocked_id: blockedId });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
    }
}
