import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rowToProfile } from '@/lib/db-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const genders = searchParams.get('genders')?.split(',').filter(Boolean);
    const years = searchParams.get('years')?.split(',').filter(Boolean);
    const domains = searchParams.get('domains')?.split(',').filter(Boolean);

    try {
        let query = supabaseAdmin
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
        if (domains && domains.length > 0) {
            query = query.overlaps('domains', domains);
        }

        // If userId is provided, exclude users with an active relationship
        if (userId) {
            const excludedIds = new Set<string>();
            // Always exclude self
            excludedIds.add(userId);

            // 1. Outgoing likes (requests I have sent) — exclude these from discover
            //    NOTE: We do NOT exclude outgoing "pass" swipes so they can re-appear.
            const { data: outgoingLikes } = await supabaseAdmin
                .from('swipes')
                .select('target_id')
                .eq('swiper_id', userId)
                .eq('action', 'like');

            // 2. Incoming likes (people who sent ME a request) — show in Likes, not Discover
            const { data: incomingLikes } = await supabaseAdmin
                .from('swipes')
                .select('swiper_id')
                .eq('target_id', userId)
                .eq('action', 'like');

            // 3. Matched users (mutual connection established)
            const { data: matches } = await supabaseAdmin
                .from('matches')
                .select('user1_id, user2_id')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

            if (outgoingLikes) {
                outgoingLikes.forEach((s: any) => {
                    if (s.target_id) excludedIds.add(s.target_id);
                });
            }

            if (incomingLikes) {
                incomingLikes.forEach((s: any) => {
                    if (s.swiper_id) excludedIds.add(s.swiper_id);
                });
            }

            if (matches) {
                matches.forEach((m: any) => {
                    const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
                    if (otherId) excludedIds.add(otherId);
                });
            }

            if (excludedIds.size > 0) {
                // Quote IDs to handle special characters (emails, UUIDs with hyphens, etc.)
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
