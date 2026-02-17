
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/user/report
export async function POST(req: Request) {
    try {
        const { reporterId, reportedId, reason, details } = await req.json();

        if (!reporterId || !reportedId || !reason) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: reporterId,
                reported_id: reportedId,
                reason,
                details
            });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to report user' }, { status: 500 });
    }
}
