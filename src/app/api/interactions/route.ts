import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { updateReputation, REP_POINTS } from '@/lib/reputation';

// Force dynamic so Next.js never caches this route at the CDN/edge layer
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { userId, targetId, action, message } = await req.json();

        if (!userId || !targetId || !action) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Handle Star (Super Like)
        if (action === 'star') {
            const { error } = await supabaseAdmin
                .from('stars')
                .upsert({ user_id: userId, starred_id: targetId }, { onConflict: 'user_id,starred_id' });

            if (error) {
                console.error('Star error:', error);
                return NextResponse.json({ error: 'Failed to star' }, { status: 500 });
            }

            await updateReputation(targetId, REP_POINTS.STARRED, 'received_star');
            return NextResponse.json({ success: true, message: 'Starred user' });
        }

        // Handle Unstar
        if (action === 'unstar') {
            const { error } = await supabaseAdmin
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

        // Handle Pass (Reject)
        if (action === 'pass') {
            // Record the current user's pass swipe (idempotent upsert)
            const { error } = await supabaseAdmin
                .from('swipes')
                .upsert({ swiper_id: userId, target_id: targetId, action: 'pass' }, { onConflict: 'swiper_id,target_id' });

            if (error) {
                console.error('Pass error:', error);
                return NextResponse.json({ error: 'Failed to pass' }, { status: 500 });
            }
            return NextResponse.json({ success: true, message: 'Passed user' });
        }

        // Handle Like (Accept a request or send a new one)
        if (action === 'like') {
            // RACE-CONDITION FIX: Write OWN swipe FIRST, then check if target already liked.
            // This ensures concurrent likes correctly detect a mutual match.
            const { error: firstError } = await supabaseAdmin
                .from('swipes')
                .upsert({ swiper_id: userId, target_id: targetId, action: 'like', message: message || null }, { onConflict: 'swiper_id,target_id' });

            if (firstError) {
                console.error('Like swipe error:', firstError);
                return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
            }

            // Now check if the other user already liked us (mutual match detection)
            const { data: targetSwipe } = await supabaseAdmin
                .from('swipes')
                .select('action')
                .eq('swiper_id', targetId)
                .eq('target_id', userId)
                .eq('action', 'like')
                .maybeSingle();

            if (targetSwipe) {
                // === MUTUAL MATCH ===
                // Check if match already exists to prevent duplicates
                const { data: existingMatch } = await supabaseAdmin
                    .from('matches')
                    .select('id')
                    .or(`and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`)
                    .maybeSingle();

                let matchId = existingMatch?.id;

                if (!existingMatch) {
                    matchId = `match_${Date.now()}`;
                    const { error: matchError } = await supabaseAdmin
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
                        const { data: userProfile } = await supabaseAdmin
                            .from('profiles')
                            .select('first_name, last_name')
                            .eq('id', userId)
                            .maybeSingle();

                        const { data: targetProfile } = await supabaseAdmin
                            .from('profiles')
                            .select('first_name, last_name')
                            .eq('id', targetId)
                            .maybeSingle();

                        const userName = userProfile?.first_name || 'Someone';
                        const targetName = targetProfile?.first_name || 'Someone';

                        // Notify the person whose like was accepted (the original liker)
                        await supabaseAdmin.from('notifications').insert({
                            user_id: targetId,
                            type: 'match',
                            title: 'Request Accepted! 🎉',
                            message: `${userName} accepted your request! You can now chat.`,
                            data: { matchId, otherUserId: userId },
                        });

                        // Notify the person who accepted
                        await supabaseAdmin.from('notifications').insert({
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
                    matchId: matchId
                });
            }

            // Just a like (Pending) — notify the target that someone liked them
            const { data: likerProfile } = await supabaseAdmin
                .from('profiles')
                .select('first_name')
                .eq('id', userId)
                .maybeSingle();

            const likerName = likerProfile?.first_name || 'Someone';

            await supabaseAdmin.from('notifications').insert({
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
            // Remove match record in both directions
            await supabaseAdmin
                .from('matches')
                .delete()
                .or(`and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`);

            // Remove BOTH swipe records (bidirectional) so users can interact again
            await supabaseAdmin
                .from('swipes')
                .delete()
                .eq('swiper_id', userId)
                .eq('target_id', targetId);

            await supabaseAdmin
                .from('swipes')
                .delete()
                .eq('swiper_id', targetId)
                .eq('target_id', userId);

            return NextResponse.json({ success: true, message: 'Unmatched user' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Interaction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
