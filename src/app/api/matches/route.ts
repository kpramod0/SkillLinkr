import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rowToProfile } from '@/lib/db-helpers';

// Force dynamic so Next.js never caches this route at the CDN/edge layer
export const dynamic = 'force-dynamic';

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
        // Find matches where user is either user1 or user2
        // Use supabaseAdmin to bypass RLS — server-side route, identity validated by userId param
        const { data: matches, error } = await supabaseAdmin
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
        const otherUserIds = matches.map((m: any) => m.user1_id === userId ? m.user2_id : m.user1_id);

        let query = supabaseAdmin
            .from('profiles')
            .select('*')
            .in('id', otherUserIds);

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
            console.error('Error fetching matched profiles:', profileError);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json((profiles || []).map(rowToProfile));
    } catch (error) {
        console.error('Error fetching matches:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
