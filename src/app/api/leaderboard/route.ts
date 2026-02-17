import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const myRank = searchParams.get('myRank') === 'true';
        const userId = searchParams.get('userId');

        // Mode 1: Get Specific User's Rank
        if (myRank && userId) {
            // Get user's reputation
            const { data: userConfig, error: userError } = await supabase
                .from('profiles')
                .select('reputation, first_name, last_name, visuals')
                .eq('id', userId)
                .single();

            if (userError || !userConfig) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const myRep = userConfig.reputation || 0;

            // Count users with MORE reputation
            // select count(*) from profiles where reputation > myRep
            const { count, error: countError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gt('reputation', myRep);

            if (countError) throw countError;

            // Rank = count + 1
            const rank = (count || 0) + 1;

            return NextResponse.json({
                rank,
                reputation: myRep,
                profile: {
                    id: userId,
                    personal: { firstName: userConfig.first_name, lastName: userConfig.last_name },
                    visuals: userConfig.visuals || {}
                }
            });
        }

        // Mode 2: Get Top X Users
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('reputation', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
