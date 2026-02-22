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
        // PERF: Run all exclusion queries in PARALLEL instead of sequential awaits.
        // This collapses a ~600ms waterfall into a single ~200ms parallel batch.
        const exclusionPromises = userId ? [
            supabaseAdmin.from('swipes').select('target_id').eq('swiper_id', userId).eq('action', 'like'),
            supabaseAdmin.from('swipes').select('swiper_id').eq('target_id', userId).eq('action', 'like'),
            supabaseAdmin.from('matches').select('user1_id, user2_id').or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
        ] : [];

        const [outgoingResult, incomingResult, matchesResult] = await Promise.all(exclusionPromises);

        // Build the exclusion set from parallel results
        const excludedIds = new Set<string>();
        if (userId) {
            excludedIds.add(userId);
            (outgoingResult?.data || []).forEach((s: any) => { if (s.target_id) excludedIds.add(s.target_id); });
            (incomingResult?.data || []).forEach((s: any) => { if (s.swiper_id) excludedIds.add(s.swiper_id); });
            (matchesResult?.data || []).forEach((m: any) => {
                const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
                if (otherId) excludedIds.add(otherId);
            });
        }

        // Build main profile query with all filters
        let query = supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('onboarding_completed', true);

        if (genders && genders.length > 0 && !genders.includes('Any')) {
            query = query.in('gender', genders);
        }
        if (years && years.length > 0) {
            query = query.in('year', years);
        }
        if (domains && domains.length > 0) {
            query = query.overlaps('domains', domains);
        }
        if (excludedIds.size > 0) {
            query = query.not('id', 'in', `(${Array.from(excludedIds).map(id => `"${id}"`).join(',')})`);
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
