import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: routeId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        // CASE 1: TEAM CHAT
        if (routeId.startsWith('team_')) {
            const teamId = routeId.replace('team_', '');

            // Verify membership
            const { data: member } = await supabaseAdmin
                .from('team_members')
                .select('id')
                .eq('team_id', teamId)
                .eq('user_id', userId)
                .single();

            if (!member) {
                return NextResponse.json({ error: 'Not a member' }, { status: 403 });
            }

            // Fetch Team Messages
            const { data: messages, error } = await supabaseAdmin
                .from('messages')
                .select(`
                    id, content, timestamp, sender_id,
                    sender: sender_id ( first_name, last_name, photos, visuals )
                `)
                .eq('team_id', teamId)
                .order('timestamp', { ascending: true });

            if (error) throw error;

            const formattedMessages = messages.map(m => {
                // Sender logic
                const isMe = m.sender_id === userId;
                const senderProfile = Array.isArray(m.sender) ? m.sender[0] : m.sender; // Handle potential array return

                // Fallback for sender name/photo
                let senderName = 'Unknown';
                let senderPhoto = '';

                if (senderProfile) {
                    senderName = `${senderProfile.first_name} ${senderProfile.last_name}`;
                    // Photo fallback logic matching other parts of app
                    senderPhoto = senderProfile.photos?.[0] || senderProfile.visuals?.photos?.[0] || '';
                }

                return {
                    id: m.id,
                    content: m.content,
                    sender: isMe ? 'me' : 'them', // UI uses 'me' vs 'them' for alignment
                    senderName, // New field for group chat
                    senderPhoto, // New field for group chat
                    timestamp: new Date(m.timestamp)
                };
            });

            return NextResponse.json({
                messages: formattedMessages,
                isMatch: true, // Always allowed if member
                isTeam: true,
                otherUserLastActive: null
            });
        }

        // CASE 2: DIRECT MESSAGE (Existing Logic)
        const otherUserId = routeId;

        // Get messages between these two users
        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .or(
                `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
            )
            .order('timestamp', { ascending: true });

        if (error) throw error;

        // Format messages
        const formattedMessages = (messages || []).map(m => ({
            id: m.id,
            content: m.content,
            sender: m.sender_id === userId ? 'me' : 'them',
            timestamp: new Date(m.timestamp)
        }));

        // Check if matched
        const { data: match } = await supabaseAdmin
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
            .single();

        const isMatch = !!match;

        // Update current user's lastActive
        await supabaseAdmin
            .from('profiles')
            .update({ last_active: Date.now() })
            .eq('id', userId);

        // Get other user's lastActive
        const { data: otherProfile } = await supabaseAdmin
            .from('profiles')
            .select('last_active')
            .eq('id', otherUserId)
            .single();

        return NextResponse.json({
            messages: formattedMessages,
            isMatch,
            otherUserLastActive: otherProfile?.last_active || null
        });

    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
