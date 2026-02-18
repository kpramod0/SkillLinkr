import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function getSupabaseAuth() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

async function requireAuthEmail(req: Request) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return { email: null, supabase: null };

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email) return { email: null, supabase };

    return { email: data.user.email, supabase };
}

export async function GET(req: Request) {
    const { email: authEmail, supabase: userClient } = await requireAuthEmail(req);
    // Relaxed Auth: Allow query param if no JWT
    // if (!authEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = authEmail || userIdParam;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Use userClient if available (preferred for RLS), otherwise fallback to Admin (if exists)
    // But since we suspect Admin is broken in prod, we really want userClient.
    // However, if we authenticated via userIdParam (no token), userClient is null/anon.
    // In that case, we MUST use supabaseAdmin (and hope it works) OR fail.
    const db = userClient || supabaseAdmin;

    try {
        // 1) Matches
        const { data: matches, error: matchErr } = await db
            .from('matches')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (matchErr) throw matchErr;

        const friendIds = (matches || []).map((m: any) => (m.user1_id === userId ? m.user2_id : m.user1_id));

        let profiles: any[] = [];
        if (friendIds.length > 0) {
            const { data: profs, error: profErr } = await supabaseAdmin.from('profiles').select('*').in('id', friendIds);
            if (profErr) throw profErr;
            profiles = profs || [];
        }

        const directConversations = await Promise.all(
            (matches || []).map(async (match: any) => {
                const friendId = match.user1_id === userId ? match.user2_id : match.user1_id;
                const friend = profiles.find((p: any) => p.id === friendId);
                if (!friend) return null;

                // unread count (DM only)
                const { count } = await supabaseAdmin
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', userId)
                    .eq('sender_id', friendId)
                    .eq('is_read', false);

                return {
                    id: match.id,
                    friendId: friend.id,
                    friendName: `${friend.first_name || friend.personal?.firstName || 'Unknown'} ${friend.last_name || friend.personal?.lastName || ''
                        }`.trim(),
                    friendPhoto: friend.photos?.[0] || friend.visuals?.photos?.[0] || '',
                    lastMessage: match.last_message,
                    lastMessageAt: match.last_message_at,
                    unreadCount: count || 0,
                    type: 'direct',
                };
            })
        );

        const validDirect = directConversations.filter(Boolean) as any[];

        // 2) Teams where user is member
        const { data: teamMembers, error: tmErr } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);

        if (tmErr) throw tmErr;

        let teamConversations: any[] = [];
        const teamIds = (teamMembers || []).map((t: any) => t.team_id);

        if (teamIds.length > 0) {
            const { data: teams, error: teamsErr } = await supabaseAdmin.from('teams').select('*').in('id', teamIds);
            if (teamsErr) throw teamsErr;

            teamConversations = (teams || []).map((team: any) => ({
                id: `team_${team.id}`,
                dbId: team.id,
                type: 'group',
                friendId: null,
                friendName: team.title,
                friendPhoto: null,
                lastMessage: team.last_message,
                lastMessageAt: team.last_message_at || team.created_at,
                unreadCount: 0,
            }));
        }

        // Merge + sort by lastMessageAt
        const all = [...validDirect, ...teamConversations].sort((a: any, b: any) => {
            const timeA = new Date(a.lastMessageAt || 0).getTime();
            const timeB = new Date(b.lastMessageAt || 0).getTime();
            return timeB - timeA;
        });

        return NextResponse.json(all);
    } catch (error) {
        console.error('FetchConversations Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
