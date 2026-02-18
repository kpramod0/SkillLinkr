import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateReputation, REP_POINTS } from '@/lib/reputation';

export async function POST(req: Request) {
    try {
        const { userId, targetId, action, message } = await req.json();

        if (!userId || !targetId || !action) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Handle Star (Super Like)
        if (action === 'star') {
            const { error } = await supabase
                .from('stars')
                .upsert({ user_id: userId, starred_id: targetId }, { onConflict: 'user_id,starred_id' });

            if (error) {
                console.error('Star error:', error);
                return NextResponse.json({ error: 'Failed to star' }, { status: 500 });
            }

            // Award reputation to the person being starred
            await updateReputation(targetId, REP_POINTS.STARRED, 'received_star');

            return NextResponse.json({ success: true, message: 'Starred user' });
        }

        // Handle Unstar
        if (action === 'unstar') {
            const { error } = await supabase
                .from('stars')
                .delete()
                .eq('user_id', userId)
                .eq('starred_id', targetId);

            if (error) {
                console.error('Unstar error:', error);
                return NextResponse.json({ error: 'Failed to unstar' }, { status: 500 });
            }
            return NextResponse.json({ success: true, message: 'Unstarred user' });
        }

        // Handle Pass
        if (action === 'pass') {
            const { error } = await supabase
                .from('swipes')
                .upsert({ swiper_id: userId, target_id: targetId, action: 'pass' }, { onConflict: 'swiper_id,target_id' });

            // If we are passing (rejecting) someone who liked us, we MUST delete their like
            // so they can potentially show up again (or at least we acknowledge the rejection processed)
            // This satisfies: "If He Reject my Request then he again start appearing in my Discover"
            await supabase
                .from('swipes')
                .delete()
                .eq('swiper_id', targetId)
                .eq('target_id', userId);

            if (error) {
                console.error('Pass error:', error);
                return NextResponse.json({ error: 'Failed to pass' }, { status: 500 });
            }
            return NextResponse.json({ success: true, message: 'Passed user' });
        }

        // Handle Like
        if (action === 'like') {
            // Check if target already liked user (Mutual Match)
            const { data: targetSwipe } = await supabase
                .from('swipes')
                .select('action')
                .eq('swiper_id', targetId)
                .eq('target_id', userId)
                .eq('action', 'like')
                .single();

            // Record the swipe
            let swipeError: any = null;
            const { error: firstError } = await supabase
                .from('swipes')
                .upsert({ swiper_id: userId, target_id: targetId, action: 'like', message: message || null }, { onConflict: 'swiper_id,target_id' });

            if (firstError) {
                console.error('Like swipe error:', firstError);
                return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
            }

            if (targetSwipe) {
                // Mutual like! Create match
                const matchId = `match_${Date.now()}`;

                // Check if match already exists - IMPORTANT: Prevent duplicate match points
                const { data: existingMatch } = await supabase
                    .from('matches')
                    .select('id')
                    .or(`and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`)
                    .single();

                if (!existingMatch) {
                    const { error: matchError } = await supabase
                        .from('matches')
                        .insert({
                            id: matchId,
                            user1_id: userId,
                            user2_id: targetId,
                            created_at: new Date().toISOString(),
                            last_message: 'You Matched! 🎉',
                            last_message_at: new Date().toISOString()
                        });

                    if (matchError) {
                        console.error('Match create error:', matchError);
                    } else {
                        // Award reputation to BOTH users for a successful match
                        await updateReputation(userId, REP_POINTS.MATCHED, 'match_made');
                        await updateReputation(targetId, REP_POINTS.MATCHED, 'match_made');

                        // Fetch names for notification messages
                        const { data: userProfile } = await supabase
                            .from('profiles')
                            .select('first_name, last_name')
                            .eq('id', userId)
                            .single();

                        const { data: targetProfile } = await supabase
                            .from('profiles')
                            .select('first_name, last_name')
                            .eq('id', targetId)
                            .single();

                        const userName = userProfile?.first_name || 'Someone';
                        const targetName = targetProfile?.first_name || 'Someone';

                        // Notify User A (original liker) that their request was accepted
                        await supabase.from('notifications').insert({
                            user_id: targetId,
                            type: 'match',
                            title: 'Request Accepted! 🎉',
                            message: `${userName} accepted your request! You can now chat.`,
                            data: { matchId, otherUserId: userId },
                        });

                        // Notify User B (who accepted) about the new match
                        await supabase.from('notifications').insert({
                            user_id: userId,
                            type: 'match',
                            title: 'New Match! 🎉',
                            message: `You and ${targetName} are now connected!`,
                            data: { matchId, otherUserId: targetId },
                        });
                    }
                }

                return NextResponse.json({
                    success: true,
                    matched: true,
                    matchId: existingMatch?.id || matchId
                });
            }

            // Just a like (Pending) — notify the target that someone liked them
            // Fetch liker's name for the notification
            const { data: likerProfile } = await supabase
                .from('profiles')
                .select('first_name')
                .eq('id', userId)
                .single();

            const likerName = likerProfile?.first_name || 'Someone';

            await supabase.from('notifications').insert({
                user_id: targetId,
                type: 'like',
                title: 'New Request! 💜',
                message: `${likerName} wants to connect with you!`,
                data: { fromUserId: userId },
            });

            return NextResponse.json({ success: true, matched: false });
        }

        // Handle Unmatch
        if (action === 'unmatch') {
            // Remove match
            await supabase
                .from('matches')
                .delete()
                .or(`and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`);

            // Remove swipe record
            await supabase
                .from('swipes')
                .delete()
                .eq('swiper_id', userId)
                .eq('target_id', targetId);

            return NextResponse.json({ success: true, message: 'Unmatched user' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Interaction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
