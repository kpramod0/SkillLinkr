import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        // Find matches where user is either user1 or user2
        const { data: matches, error } = await supabase
            .from('matches')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        if (error) {
            console.error('Error fetching matches:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json([]);
        }

        // Get the other user's profile for each match
        const otherUserIds = matches.map(m => m.user1_id === userId ? m.user2_id : m.user1_id);

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', otherUserIds);

        if (profileError) {
            console.error('Error fetching matched profiles:', profileError);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json((profiles || []).map(rowToProfile));
    } catch (error) {
        console.error('Error fetching matches:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
