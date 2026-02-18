import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/activity — Fetch activity log (persistent notifications)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        // 1. Get all users who liked you (with timestamps from swipes)
        const { data: incomingLikes } = await supabase
            .from('swipes')
            .select('swiper_id, created_at')
            .eq('target_id', userId)
            .eq('action', 'like')
            .order('created_at', { ascending: false });

        // 2. Get all your matches (accepted connections)
        const { data: matches } = await supabase
            .from('matches')
            .select('user1_id, user2_id, created_at')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        // 3. Get your own outgoing likes
        const { data: outgoingLikes } = await supabase
            .from('swipes')
            .select('target_id, created_at')
            .eq('swiper_id', userId)
            .eq('action', 'like')
            .order('created_at', { ascending: false });

        // 4. Get your outgoing passes (you passed someone)
        const { data: outgoingPasses } = await supabase
            .from('swipes')
            .select('target_id, created_at')
            .eq('swiper_id', userId)
            .eq('action', 'pass')
            .order('created_at', { ascending: false });

        // Build a set of matched user IDs for lookup
        const matchedPairs = new Set<string>();
        (matches || []).forEach((m: any) => {
            const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
            matchedPairs.add(otherId);
        });

        // Collect all user IDs we need profiles for
        const allUserIds = new Set<string>();
        (incomingLikes || []).forEach(l => allUserIds.add(l.swiper_id));
        (outgoingLikes || []).forEach(l => allUserIds.add(l.target_id));
        (outgoingPasses || []).forEach(l => allUserIds.add(l.target_id));
        (matches || []).forEach(m => {
            allUserIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
        });

        // Fetch all profiles at once
        let profileMap: Record<string, any> = {};
        if (allUserIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, profile_photo_url')
                .in('id', Array.from(allUserIds));

            (profiles || []).forEach(p => {
                profileMap[p.id] = p;
            });
        }

        // Build activity entries
        const activities: any[] = [];

        // Incoming likes => "X liked you"
        (incomingLikes || []).forEach(l => {
            const profile = profileMap[l.swiper_id];
            if (!profile) return;
            const isMatched = matchedPairs.has(l.swiper_id);

            activities.push({
                id: `like_${l.swiper_id}`,
                type: isMatched ? 'matched' : 'liked_you',
                userId: l.swiper_id,
                userName: `${profile.first_name} ${profile.last_name}`.trim(),
                userPhoto: profile.profile_photo_url,
                userInitial: profile.first_name?.[0] || '?',
                timestamp: l.created_at,
                message: isMatched
                    ? `You and ${profile.first_name} are now connected!`
                    : `${profile.first_name} liked your profile`
            });
        });

        // Outgoing likes => "You liked X" or "X accepted your request!"
        (outgoingLikes || []).forEach(l => {
            const profile = profileMap[l.target_id];
            if (!profile) return;
            const isMatched = matchedPairs.has(l.target_id);

            if (isMatched) {
                // Show "accepted" notification — they liked you back!
                activities.push({
                    id: `accepted_${l.target_id}`,
                    type: 'request_accepted',
                    userId: l.target_id,
                    userName: `${profile.first_name} ${profile.last_name}`.trim(),
                    userPhoto: profile.profile_photo_url,
                    userInitial: profile.first_name?.[0] || '?',
                    timestamp: l.created_at,
                    message: `${profile.first_name} accepted your request! You're now connected 🎉`
                });
            } else {
                activities.push({
                    id: `sent_${l.target_id}`,
                    type: 'you_liked',
                    userId: l.target_id,
                    userName: `${profile.first_name} ${profile.last_name}`.trim(),
                    userPhoto: profile.profile_photo_url,
                    userInitial: profile.first_name?.[0] || '?',
                    timestamp: l.created_at,
                    message: `You sent a request to ${profile.first_name}`
                });
            }
        });

        // Outgoing passes => "You passed on X"
        (outgoingPasses || []).forEach(l => {
            const profile = profileMap[l.target_id];
            if (!profile) return;

            activities.push({
                id: `passed_${l.target_id}`,
                type: 'you_passed',
                userId: l.target_id,
                userName: `${profile.first_name} ${profile.last_name}`.trim(),
                userPhoto: profile.profile_photo_url,
                userInitial: profile.first_name?.[0] || '?',
                timestamp: l.created_at,
                message: `You passed on ${profile.first_name}'s request`
            });
        });

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json(activities);
    } catch (error) {
        console.error('Activity error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
