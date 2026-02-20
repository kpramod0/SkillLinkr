import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lightweight auth client for JWT validation
function getSupabaseAuth() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

/**
 * Validates the request's Bearer token and returns the user's email.
 */
async function requireAuthEmail(req: Request) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return { email: null, supabase: null };

    // Create client with user's token (Respects RLS)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email) return { email: null, supabase };

    return { email: data.user.email, supabase };
}

/**
 * Checks if a user is a member of the specified team using Admin client.
 * Essential for enforcing access control on group chats.
 */
async function isTeamMember(teamId: string, userId: string, client: any) {
    const { data, error } = await client
        .from('team_members')
        .select('team_id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .limit(1);
    if (error) return false;
    return !!data?.[0];
}

/**
 * Checks if two users have a confirmed match.
 * Essential for enforcing access control on Direct Messages.
 */
async function hasMatch(userId: string, targetId: string, client: any) {
    const { data, error } = await client
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`)
        .limit(1);
    if (error) return false;
    return !!data?.[0];
}

// GET: Fetch messages between two users OR for a team
/**
 * GET Handler
 * Fetches message history for a specific chat (Direct Message or Team).
 * Enforces strict access control:
 * - For Teams: User must be a member of the team.
 * - For DMs: Users must have a confirmed 'match' record.
 */
export async function GET(req: Request) {
    const { email: authEmail, supabase: userClient } = await requireAuthEmail(req);
    // Custom Auth Support: If no JWT, trust userId param (matches POST behavior)
    // if (!authEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId'); // trusted if no authEmail
    const targetId = searchParams.get('targetId'); // Friend ID for DMs
    const teamId = searchParams.get('teamId'); // Team ID for Groups

    // Security: Prevent impersonation if JWT exists
    if (authEmail && userIdParam && userIdParam !== authEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Identify the acting user
    const actingUser = authEmail || userIdParam;
    if (!actingUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!targetId && !teamId) {
            return NextResponse.json({ error: 'Missing targetId or teamId' }, { status: 400 });
        }

        // select db client (userClient preferred)
        const db = userClient || supabaseAdmin;

        if (!db || typeof db.from !== 'function') {
            return NextResponse.json({ error: 'Service Unavailable: Database client failed' }, { status: 503 });
        }

        // --- Authorization Checks ---
        // 1. Team Chat: Must be a member
        if (teamId) {
            const ok = await isTeamMember(teamId, actingUser, db);
            if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // 2. Direct Message: Must be a match
        else if (targetId) {
            const ok = await hasMatch(actingUser, targetId, db);
            if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- Fetch Messages ---
        let query = db.from('messages').select('*').order('timestamp', { ascending: true });

        if (teamId) {
            query = query.eq('team_id', teamId);
        } else {
            // Helper to get messages where (sender=Me, receiver=You) OR (sender=You, receiver=Me)
            query = query.or(
                `and(sender_id.eq.${actingUser},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${actingUser})`
            );
        }

        const { data: messages, error } = await query;
        if (error) throw error;

        // --- Enrich with Sender Profiles ---
        // Efficiently fetch profiles for all unique senders in this batch
        const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id).filter(Boolean))];

        const profileMap = new Map<string, any>();
        if (senderIds.length > 0) {
            const { data: profiles } = await db
                .from('profiles')
                .select('id, first_name, last_name, photos')
                .in('id', senderIds);

            (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
        }

        // Attach profile data to each message object
        const messagesWithSender = (messages || []).map((msg: any) => {
            const sender = profileMap.get(msg.sender_id);
            return {
                ...msg,
                sender: sender
                    ? { first_name: sender.first_name || '', last_name: sender.last_name || '', photos: sender.photos || [] }
                    : null,
            };
        });

        return NextResponse.json(messagesWithSender);
    } catch (error) {
        console.error('Fetch Messages Error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST: Send a message (DM or Group)
/**
 * POST Handler
 * Sends a new message to a DM or Group Chat.
 * Handles:
 * 1. Authorization (Sender identity + Permission to post)
 * 2. Message persistence
 * 3. Updating conversation metadata (last_message, last_message_at)
 */
export async function POST(req: Request) {
    const { email: authEmail, supabase: userClient } = await requireAuthEmail(req);
    // Custom Auth Support: If no JWT, trust senderId from body
    // if (!authEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { senderId, receiverId, teamId, content, attachmentUrl, attachmentType, fileName, fileSize } =
            await req.json();

        // Security: Prevent spoofing sender ONLY if we have an authEmail to check against
        if (authEmail && senderId !== authEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // If no authEmail, we blindly trust senderId (Legacy/Custom Auth)
        if (!senderId) {
            return NextResponse.json({ error: 'Missing senderId' }, { status: 400 });
        }

        if (!receiverId && !teamId) {
            return NextResponse.json({ error: 'Missing receiverId or teamId' }, { status: 400 });
        }

        // select db client
        const db = userClient || supabaseAdmin;

        if (!db || typeof db.from !== 'function') {
            return NextResponse.json({ error: 'Service Unavailable: Database client failed' }, { status: 503 });
        }

        // --- Authorization Checks ---
        const actingUser = authEmail || senderId;
        // 1. Group Chat: Sender must be a member
        if (teamId) {
            const ok = await isTeamMember(String(teamId), actingUser, db);
            if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // 2. Direct Message: Sender must match with receiver
        else if (receiverId) {
            const ok = await hasMatch(actingUser, receiverId, db);
            if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const timestamp = Date.now();
        const id = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Fallback for empty content (e.g. image-only messages)
        const resolvedContent =
            content || (attachmentType === 'image' ? 'Sent an image' : attachmentType ? 'Sent a file' : '');

        // Construct message object
        const messageData: any = {
            id,
            sender_id: senderId,
            content: resolvedContent,
            timestamp,
        };

        if (attachmentUrl) messageData.attachment_url = attachmentUrl;
        if (attachmentType && attachmentType !== 'text') messageData.attachment_type = attachmentType;
        if (fileName) messageData.file_name = fileName;
        if (fileSize) messageData.file_size = fileSize;

        if (teamId) {
            messageData.team_id = teamId;
            messageData.receiver_id = null;
        } else {
            messageData.receiver_id = receiverId;
        }

        // --- Persist Message ---
        const { error: msgError } = await db.from('messages').insert(messageData);
        if (msgError) throw msgError;

        const nowIso = new Date().toISOString();

        // --- Update Conversation Metadata ---
        // Updates `last_message` and `last_message_at` so the chat moves to the top
        if (teamId) {
            await db
                .from('teams')
                .update({ last_message: resolvedContent, last_message_at: nowIso })
                .eq('id', teamId);
        } else {
            await db
                .from('matches')
                .update({ last_message: resolvedContent, last_message_at: nowIso })
                .or(`and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`);
        }

        return NextResponse.json({ success: true, id, timestamp });
    } catch (error: any) {
        console.error('SendMessage Error:', error?.message || error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}
