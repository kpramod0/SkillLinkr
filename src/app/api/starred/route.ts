import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const q = searchParams.get('q')?.toLowerCase();
    const genders = searchParams.get('genders')?.split(',').filter(Boolean);
    const years = searchParams.get('years')?.split(',').filter(Boolean);
    const domains = searchParams.get('domains')?.split(',').filter(Boolean);

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
        const starredIds = starRows.map((r: any) => r.starred_id);

        let query = supabase
            .from('profiles')
            .select('*')
            .in('id', starredIds);

        // Apply Filters
        if (genders && genders.length > 0 && !genders.includes('Any')) {
            query = query.in('gender', genders);
        }
        if (years && years.length > 0) {
            query = query.in('year', years);
        }
        if (domains && domains.length > 0) {
            query = query.overlaps('domains', domains);
        }

        // Search query
        if (q) {
            query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
        }

        const { data: profiles, error: profileError } = await query;

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
