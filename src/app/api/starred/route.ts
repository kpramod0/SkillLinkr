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
        // Get all starred user IDs for this user
        const { data: starRows, error } = await supabase
            .from('stars')
            .select('starred_id')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching stars:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        if (!starRows || starRows.length === 0) {
            return NextResponse.json([]);
        }

        // Get profiles of starred users
        const starredIds = starRows.map(r => r.starred_id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', starredIds);

        if (profileError) {
            console.error('Error fetching starred profiles:', profileError);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json((profiles || []).map(rowToProfile));
    } catch (error) {
        console.error('Error fetching starred users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
