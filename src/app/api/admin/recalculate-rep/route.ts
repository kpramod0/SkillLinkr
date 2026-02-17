import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { REP_POINTS } from '@/lib/reputation';

export async function GET(req: Request) {
    try {
        // fetch all profiles
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        const updates = profiles.map(profile => {
            let score = 0;

            // 1. Projects (+3 each)
            if (profile.portfolio && Array.isArray(profile.portfolio)) {
                score += profile.portfolio.length * REP_POINTS.PROJECT_ADDED;
            }

            // 2. GitHub (+4)
            if (profile.visuals?.github) {
                score += REP_POINTS.GITHUB_LINKED;
            }

            // 3. LinkedIn (+4)
            if (profile.visuals?.linkedin) {
                score += REP_POINTS.LINKEDIN_LINKED;
            }

            // 4. Profile Complete (+2)
            // Loose check: has skills and year
            if (profile.professionalDetails?.skills?.length > 0 && profile.professionalDetails?.year) {
                score += REP_POINTS.PROFILE_COMPLETE;
            }

            // Note: We cannot easily retroactively calculate 'Messages Received' or 'Matches' 
            // without querying those tables and summing them up.
            // Let's do that for accuracy!

            return { id: profile.id, base_score: score };
        });

        // Loop and update (or better, gather all async promises)
        // For accurate recalculation, we should also count their matches and stars received.
        // This might be heavy, but it's a one-time sync.

        let totalUpdated = 0;

        for (const user of updates) {
            let extraScore = 0;

            // Count Stars Received (+10 each)
            const { count: starCount } = await supabase
                .from('stars')
                .select('*', { count: 'exact', head: true })
                .eq('starred_id', user.id);
            extraScore += (starCount || 0) * REP_POINTS.STARRED;

            // Count Matches (+15 each)
            const { count: matchCount } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
            extraScore += (matchCount || 0) * REP_POINTS.MATCHED;

            // Count Messages Received (+1 each, capping is hard so we ignore cap for retroactive?)
            // Actually, ignoring cap for retroactive might be fair since they were valid messages.
            const { count: msgCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id);
            extraScore += (msgCount || 0) * REP_POINTS.MESSAGE_RECEIVED;

            const finalScore = user.base_score + extraScore;

            // Update
            await supabase
                .from('profiles')
                .update({ reputation: finalScore })
                .eq('id', user.id);

            totalUpdated++;
        }

        return NextResponse.json({ success: true, message: `Recalculated reputation for ${totalUpdated} users.` });

    } catch (error) {
        console.error("Recalculation error:", error);
        return NextResponse.json({ error: 'Failed to recalculate' }, { status: 500 });
    }
}
