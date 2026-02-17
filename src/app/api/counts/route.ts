import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/counts?userId=email&likesSeen=timestamp&chatsSeen=timestamp
// Returns counts of NEW items since last seen
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const likesSeen = searchParams.get('likesSeen');   // ISO timestamp
    const chatsSeen = searchParams.get('chatsSeen');   // ISO timestamp

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        // 1. Count pending likes (NEW since last seen)
        let likesQuery = supabase
            .from('swipes')
            .select('swiper_id, created_at')
            .eq('target_id', userId)
            .eq('action', 'like');

        // Only count likes created AFTER last seen timestamp
        if (likesSeen) {
            likesQuery = likesQuery.gt('created_at', likesSeen);
        }

        const { data: incomingLikes } = await likesQuery;
        const likerIds = (incomingLikes || []).map(s => s.swiper_id);

        let pendingLikes = 0;
        if (likerIds.length > 0) {
            // Get matched users
            const { data: matches } = await supabase
                .from('matches')
                .select('user1_id, user2_id')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

            const matchedIds = new Set(
                (matches || []).map(m => m.user1_id === userId ? m.user2_id : m.user1_id)
            );

            // Get users I already swiped on
            const { data: mySwipes } = await supabase
                .from('swipes')
                .select('target_id')
                .eq('swiper_id', userId)
                .in('target_id', likerIds);

            const swipedIds = new Set((mySwipes || []).map(s => s.target_id));

            pendingLikes = likerIds.filter(id => !matchedIds.has(id) && !swipedIds.has(id)).length;
        }

        // 2. Count pending Team Applications (NEW since last seen)
        let teamAppsCount = 0;

        // First get my teams
        const { data: myTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('creator_id', userId);

        const teamIds = (myTeams || []).map(t => t.id);

        if (teamIds.length > 0) {
            let appsQuery = supabase
                .from('team_applications')
                .select('id, created_at', { count: 'exact', head: true })
                .in('team_id', teamIds)
                .eq('status', 'pending');

            if (likesSeen) {
                appsQuery = appsQuery.gt('created_at', likesSeen);
            }

            const { count } = await appsQuery;
            teamAppsCount = count || 0;
        }

        // 3. Count UNREAD Chats (Messages where I am receiver and is_read is false)
        // We want the number of CONVERSATIONS with unread messages, not total messages.
        const { data: unreadMsgs } = await supabase
            .from('messages')
            .select('sender_id, team_id')
            .eq('receiver_id', userId)
            .eq('is_read', false); // Ensure schema has this column

        const uniqueUnreadSenders = new Set((unreadMsgs || []).map(m => m.team_id ? `team_${m.team_id}` : m.sender_id));
        const newChats = uniqueUnreadSenders.size;

        // Total notifications for "Likes" tab = Profile Likes + Team Apps
        const totalLikesAndRequests = pendingLikes + teamAppsCount;

        return NextResponse.json({
            likes: totalLikesAndRequests,
            chats: newChats,
            requests: totalLikesAndRequests
        });

    } catch (error) {
        console.error('Counts error:', error);
        return NextResponse.json({ likes: 0, chats: 0, requests: 0 });
    }
}
