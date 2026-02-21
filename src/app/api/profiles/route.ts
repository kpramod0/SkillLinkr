import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const genders = searchParams.get('genders')?.split(',').filter(Boolean);
    const years = searchParams.get('years')?.split(',').filter(Boolean);
    const domains = searchParams.get('domains')?.split(',').filter(Boolean);

    try {
        let query = supabase
            .from('profiles')
            .select('*')
            .eq('onboarding_completed', true);

        // Apply Filters on the server side
        if (genders && genders.length > 0 && !genders.includes('Any')) {
            query = query.in('gender', genders);
        }
        if (years && years.length > 0) {
            query = query.in('year', years);
        }
        // If domains are provided, we filter by array containment if possible, 
        // but for now let's just use .overlaps if domains is an array column.
        if (domains && domains.length > 0) {
            query = query.overlaps('domains', domains);
        }

        // If userId is provided, exclude users they have already matched/requested with
        if (userId) {
            // Exclude self and previously interacted profiles
            const { data: swipes } = await supabase
                .from('swipes')
                .select('target_id')
                .eq('swiper_id', userId)
                .neq('action', 'pass');

            const { data: matches } = await supabase
                .from('matches')
                .select('user1_id, user2_id, status')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

            const excludedIds = new Set<string>();
            excludedIds.add(userId);

            if (matches) {
                matches.forEach((m: any) => {
                    if (m.status !== 'rejected') {
                        excludedIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
                    }
                });
            }

            if (swipes) {
                swipes.forEach((s: any) => excludedIds.add(s.target_id));
            }

            if (excludedIds.size > 0) {
                // Quoting IDs to handle special characters in emails/UUIDs
                query = query.not('id', 'in', `(${Array.from(excludedIds).map(id => `"${id}"`).join(',')})`);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching profiles:', error);
            return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
        }

        const profiles = (data || []).map(rowToProfile);
        return NextResponse.json(profiles);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }
}
