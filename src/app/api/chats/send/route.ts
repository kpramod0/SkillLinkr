import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase'; // Keep if used for other things or remove if not. 
// Actually, usually we replace it. Let's see.
// The file probably imports 'supabase'.

import { updateReputation, REP_POINTS } from '@/lib/reputation';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { senderId, receiverId, content, teamId } = body;

        if (!senderId || (!receiverId && !teamId) || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Logic for Team Chat
        if (teamId) {
            // 1. Verify sender is in the team
            const { data: membership, error: memberError } = await supabase
                .from('team_members')
                .select('id')
                .eq('team_id', teamId)
                .eq('user_id', senderId)
                .single();

            if (memberError || !membership) {
                return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 });
            }

            // 2. Insert Message
            const timestamp = Date.now();
            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: senderId,
                    team_id: teamId,
                    content,
                    timestamp
                })
                .select()
                .single();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            // 3. Update Team's last_message for sorting
            await supabase
                .from('teams')
                .update({
                    last_message: content,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', teamId);

            // 4. Award Rep (Optional for teams? Maybe not for now to avoid spam farming)

            return NextResponse.json(message);
        }

        // Logic for DM (Existing)
        const timestamp = Date.now();
        const { data: newMessageData, error } = await supabaseAdmin
            .from('messages')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                content,
                timestamp
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
        }

        // --- Reputation Logic: Check daily cap ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Count messages received today by this user (approximation using created_at if available, or timestamp)
        // Since 'messages' table structure in schema might use 'created_at' or we can filter by timestamp (bigint)
        // Our newMessage uses 'timestamp' (number), so we filter by that.
        const startOfDayTimestamp = today.getTime();

        const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', receiverId)
            .gte('timestamp', startOfDayTimestamp);

        const dailyCount = count || 0;

        if (dailyCount <= 5) {
            await updateReputation(receiverId, REP_POINTS.MESSAGE_RECEIVED, 'message_received');
        }

        // Check if matched
        const { data: match } = await supabase
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`)
            .single();

        const isMatched = !!match;

        // Update match's last_message if matched
        if (match) {
            await supabase
                .from('matches')
                .update({
                    last_message: content,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', match.id);
        }

        return NextResponse.json({
            success: true,
            message: {
                id: newMessageData.id,
                senderId,
                receiverId,
                content,
                timestamp: newMessageData.timestamp
            },
            isRequest: !isMatched
        });

    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
