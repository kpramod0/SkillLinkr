import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        let query = supabase
            .from('profiles')
            .select('*')
            .eq('onboarding_completed', true);

        // If userId is provided, exclude users they have already matched/requested with
        if (userId) {
            // 1. Get all matches involving this user (pending, accepted, rejected)
            // Actually, we want to exclude Pending and Accepted. Rejected might be allowed to reappear?
            // User said: "If B rejects user A request then again, A will be allowed to send request" -> So don't exclude rejected.
            // But wait, if A sends to B (pending), B should not see A.

            // 1. Get all matches (Mutual)
            const { data: matches } = await supabase
                .from('matches')
                .select('user1_id, user2_id, status')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

            // 2. Get all Swipes (Unidirectional: Likes, Passes, Stars)
            // If I already swiped on them, I shouldn't see them again
            const { data: swipes } = await supabase
                .from('swipes')
                .select('target_id')
                .eq('swiper_id', userId);

            const excludedIds = new Set<string>();
            excludedIds.add(userId); // Exclude self

            // Exclude Matches (Pending/Accepted)
            if (matches) {
                matches.forEach((m: any) => {
                    if (m.status !== 'rejected') {
                        excludedIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
                    }
                });
            }

            // Exclude Swipes (I already acted on them)
            if (swipes) {
                swipes.forEach((s: any) => {
                    excludedIds.add(s.target_id);
                });
            }

            if (excludedIds.size > 0) {
                query = query.not('id', 'in', `(${Array.from(excludedIds).join(',')})`);
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
