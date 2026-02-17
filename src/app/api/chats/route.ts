import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rowToProfile } from '@/lib/db-helpers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const primaryChats: any[] = [];
        const requestChats: any[] = [];

        // 0. Get all teams this user is a member of
        const { data: teamMemberships } = await supabaseAdmin
            .from('team_members')
            .select(`
                team: team_id (
                    id, title, last_message, last_message_at, creator_id
                )
            `)
            .eq('user_id', userId);

        // Process Teams
        if (teamMemberships) {
            teamMemberships.forEach((tm: any) => {
                const team = tm.team;
                if (team) {
                    primaryChats.push({
                        id: `team_${team.id}`, // Prefix to distinguish
                        personal: {
                            firstName: team.title, // Use title as name
                            lastName: '(Team)',
                            gender: 'Team',
                            age: 0,
                            year: ''
                        },
                        visuals: {
                            photos: [], // TODO: Add team icon/image if available
                            bio: 'Team Chat'
                        },
                        lastMessage: team.last_message || 'Team created',
                        lastMessageAt: team.last_message_at ? new Date(team.last_message_at).getTime() : Date.now(),
                        isMatch: true,
                        isTeam: true,
                        creatorId: team.creator_id
                    });
                }
            });
        }

        // 1. Get all matches for this user
        const { data: matches } = await supabaseAdmin
            .from('matches')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        const matchedUserIds = new Set<string>();

        // 2. Get all messages involving this user
        const { data: allMessages } = await supabaseAdmin
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('timestamp', { ascending: false });

        const messages = allMessages || [];

        // Helper to get last message with another user
        const getLastMessage = (otherId: string) => {
            return messages.find(m =>
                (m.sender_id === userId && m.receiver_id === otherId) ||
                (m.sender_id === otherId && m.receiver_id === userId)
            );
        };

        // A. Process Matches (Primary)
        for (const match of (matches || [])) {
            const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
            if (matchedUserIds.has(otherUserId)) continue;
            matchedUserIds.add(otherUserId);

            const { data: otherProfile } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', otherUserId)
                .single();

            if (otherProfile) {
                const lastMsg = getLastMessage(otherUserId);
                const profile = rowToProfile(otherProfile);
                primaryChats.push({
                    ...profile,
                    lastMessage: lastMsg
                        ? (lastMsg.sender_id === userId ? `You: ${lastMsg.content}` : lastMsg.content)
                        : 'New Match!',
                    lastMessageAt: lastMsg ? lastMsg.timestamp : new Date(match.created_at).getTime(),
                    isMatch: true
                });
            }
        }

        // B. Process Unmatched Conversations
        const interactingUserIds = new Set<string>();
        messages.forEach(msg => {
            if (msg.sender_id === userId) interactingUserIds.add(msg.receiver_id);
            if (msg.receiver_id === userId) interactingUserIds.add(msg.sender_id);
        });

        for (const otherId of interactingUserIds) {
            if (matchedUserIds.has(otherId)) continue;

            const lastMsg = getLastMessage(otherId);
            if (!lastMsg) continue;

            const { data: otherProfile } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', otherId)
                .single();

            if (otherProfile) {
                const profile = rowToProfile(otherProfile);

                // Check if current user sent any message to this person
                const didISendAny = messages.some(m => m.sender_id === userId && m.receiver_id === otherId);

                // Check if current user liked them
                const { data: likeSwipe } = await supabaseAdmin
                    .from('swipes')
                    .select('action')
                    .eq('swiper_id', userId)
                    .eq('target_id', otherId)
                    .eq('action', 'like')
                    .single();

                if (didISendAny || likeSwipe) {
                    primaryChats.push({
                        ...profile,
                        lastMessage: lastMsg.sender_id === userId ? `You: ${lastMsg.content}` : lastMsg.content,
                        lastMessageAt: lastMsg.timestamp,
                        isMatch: false,
                        isSentRequest: true
                    });
                } else {
                    requestChats.push({
                        ...profile,
                        lastMessage: lastMsg.content,
                        lastMessageAt: lastMsg.timestamp,
                        isMatch: false,
                    });
                }
            }
        }

        return NextResponse.json({ primary: primaryChats, requests: requestChats });

    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
