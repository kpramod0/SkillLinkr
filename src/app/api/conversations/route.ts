import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireAuthEmail(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user?.email) return null;
        return data.user.email;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const authEmail = await requireAuthEmail(req);
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = authEmail || userIdParam;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = supabaseAdmin;
    if (!db || typeof db.from !== 'function') {
        console.error('[conversations] supabaseAdmin not available for user:', userId);
        return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    // ── Section 1: Direct Messages (matches) ─────────────────────────────────
    // Isolated so any failure here CANNOT affect team chats below
    const directConversations: any[] = [];
    try {
        // Fetch matches without ordering by optional column
        const { data: matches, error: matchErr } = await db
            .from('matches')
            .select('id, user1_id, user2_id, last_message, last_message_at, created_at')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        if (matchErr) {
            console.error('[conversations] matches query error:', JSON.stringify(matchErr));
        } else if (matches && matches.length > 0) {
            const friendIds = matches.map((m: any) => (m.user1_id === userId ? m.user2_id : m.user1_id));

            // Fetch all friend profiles in one query
            const { data: profiles } = await db
                .from('profiles')
                .select('id, first_name, last_name, photos')
                .in('id', friendIds);

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

            for (const match of matches) {
                try {
                    const friendId = match.user1_id === userId ? match.user2_id : match.user1_id;
                    const friend = profileMap.get(friendId);
                    if (!friend) continue;

                    // Try to get unread count — optional, default 0 if column missing
                    let unreadCount = 0;
                    try {
                        const { count } = await db
                            .from('messages')
                            .select('id', { count: 'exact', head: true })
                            .eq('receiver_id', userId)
                            .eq('sender_id', friendId)
                            .eq('is_read', false);
                        unreadCount = count || 0;
                    } catch (_) { /* is_read column may not exist */ }

                    directConversations.push({
                        id: match.id,
                        friendId: friend.id,
                        friendName: `${friend.first_name || ''} ${friend.last_name || ''}`.trim() || 'Unknown',
                        friendPhoto: friend.photos?.[0] || null,
                        lastMessage: match.last_message || null,
                        lastMessageAt: match.last_message_at || match.created_at || null,
                        unreadCount,
                        type: 'direct',
                    });
                } catch (matchItemErr) {
                    console.error('[conversations] Error processing match:', matchItemErr);
                }
            }
        }
    } catch (dmErr) {
        console.error('[conversations] DM section failed:', dmErr);
        // Do NOT re-throw — let teams section still run
    }

    // ── Section 2: Team / Group Chats ────────────────────────────────────────
    // Completely isolated — DM failure cannot touch this
    const teamConversations: any[] = [];
    try {
        const { data: teamMembers, error: tmErr } = await db
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);

        if (tmErr) {
            console.error('[conversations] team_members query error:', JSON.stringify(tmErr));
        } else {
            const teamIds = (teamMembers || []).map((t: any) => t.team_id).filter(Boolean);
            console.log(`[conversations] userId=${userId} is member of teamIds:`, teamIds);

            if (teamIds.length > 0) {
                // Fetch guaranteed columns only
                const { data: teams, error: teamsErr } = await db
                    .from('teams')
                    .select('id, title, created_at')
                    .in('id', teamIds);

                if (teamsErr) {
                    console.error('[conversations] teams query error:', JSON.stringify(teamsErr));
                } else {
                    console.log(`[conversations] teams fetched:`, (teams || []).map((t: any) => ({ id: t.id, title: t.title })));

                    // Optional: try to get last_message metadata (may not exist in prod schema)
                    const lastMsgMap: Record<string, { msg?: string; at?: string }> = {};
                    try {
                        const { data: msgData } = await db
                            .from('teams')
                            .select('id, last_message, last_message_at')
                            .in('id', teamIds);
                        (msgData || []).forEach((t: any) => {
                            lastMsgMap[String(t.id)] = { msg: t.last_message, at: t.last_message_at };
                        });
                    } catch (_) { /* columns may not exist */ }

                    for (const team of (teams || [])) {
                        const tid = String(team.id);
                        teamConversations.push({
                            id: `team_${tid}`,
                            dbId: team.id,
                            type: 'group',
                            friendId: null,
                            friendName: team.title || 'Team',
                            friendPhoto: null,
                            lastMessage: lastMsgMap[tid]?.msg || null,
                            lastMessageAt: lastMsgMap[tid]?.at || team.created_at || null,
                            unreadCount: 0,
                        });
                    }
                }
            }
        }
    } catch (teamErr) {
        console.error('[conversations] Team section failed:', teamErr);
    }

    // ── Merge & Sort ──────────────────────────────────────────────────────────
    const all = [...directConversations, ...teamConversations].sort((a, b) => {
        const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tB - tA;
    });

    console.log(`[conversations] Returning ${directConversations.length} DMs + ${teamConversations.length} teams for userId=${userId}`);
    return NextResponse.json(all);
}
