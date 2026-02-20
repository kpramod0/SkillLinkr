import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabaseAuth() {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
    });
}

async function requireAuthEmail(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const { data, error } = await getSupabaseAuth().auth.getUser(token);
    if (error || !data?.user?.email) return null;
    return data.user.email;
}

async function enrichTeams(teams: any[]): Promise<any[]> {
    if (!teams || teams.length === 0) return [];

    const teamIds = teams.map((t) => t.id);
    const creatorIds = [...new Set(teams.map((t) => t.creator_id).filter(Boolean))];

    // 1) Fetch all creator profiles
    const { data: creatorProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, photos, bio')
        .in('id', creatorIds);

    const creatorMap = new Map(((creatorProfiles || []) as any[]).map((p: any) => [p.id, p]));

    // 2) Fetch all members with their profiles for these teams
    // Note: creator IS in team_members, but we want to return them separately in the UI
    const { data: allMembers } = await supabaseAdmin
        .from('team_members')
        .select(`
            team_id,
            user_id,
            role,
            user:profiles!team_members_user_id_fkey (
                id,
                first_name,
                last_name,
                photos,
                bio,
                branch,
                year,
                domains,
                skills,
                open_to
            )
        `)
        .in('team_id', teamIds);

    // Group members by team, excluding the creator from the "members" array to avoid double-listing in UI
    const teamMembersMap = new Map<string, any[]>();
    const countMap = new Map<string, number>();

    (allMembers || []).forEach((m: any) => {
        const tid = String(m.team_id);

        // Always increment the total count (includes creator)
        countMap.set(tid, (countMap.get(tid) || 0) + 1);

        // Find the team to check who the creator is
        const team = teams.find(t => String(t.id) === tid);

        // Add to members list ONLY if they are NOT the creator
        if (team && m.user_id !== team.creator_id) {
            if (!teamMembersMap.has(tid)) teamMembersMap.set(tid, []);
            teamMembersMap.get(tid)?.push({
                user: {
                    ...m.user,
                    professionalDetails: {
                        role: m.user?.domains?.[0] || 'Member',
                        domains: m.user?.domains || [],
                        skills: m.user?.skills || []
                    }
                }
            });
        }
    });

    return teams.map((team) => {
        const tid = String(team.id);
        let cp = creatorMap.get(team.creator_id);

        // Fallback: If creator profile is missing, synthesize a basic one
        if (!cp) {
            cp = {
                id: team.creator_id,
                first_name: team.creator_id.split('@')[0],
                last_name: '(Lead)',
                photos: [],
                bio: 'Team Creator'
            };
        }

        // Robust member count:
        // Use countMap (from team_members table), but ensure it's at least 1
        const countFromMembers = countMap.get(tid) || 0;
        const finalCount = countFromMembers > 0 ? countFromMembers : 1;

        return {
            ...team,
            creator: cp ? { ...cp, short_bio: cp.bio || cp.short_bio } : null,
            member_count: finalCount,
            members: teamMembersMap.get(tid) || [],
        };
    });
}

/**
 * GET /api/teams
 * filter=mine    → Teams I created or joined
 * filter=discover → Open teams I haven't joined/applied to
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const filter = searchParams.get('filter') || 'discover';

    const authEmail = await requireAuthEmail(req);
    const userId = authEmail || userIdParam || null;

    if (authEmail && userIdParam && userIdParam !== authEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // --- MINE filter ---
        if (filter === 'mine') {
            // Find team IDs where I am a member
            const { data: memberRows, error: memberErr } = await supabaseAdmin
                .from('team_members')
                .select('team_id')
                .eq('user_id', userId);

            if (memberErr) throw memberErr;

            const memberTeamIds = (memberRows || []).map((r: any) => r.team_id);

            // Fetch teams I created
            const { data: owned, error: ownedErr } = await supabaseAdmin
                .from('teams')
                .select('*')
                .eq('creator_id', userId)
                .order('created_at', { ascending: false });

            if (ownedErr) throw ownedErr;

            // Fetch teams I joined (but didn't create)
            let memberTeams: any[] = [];
            if (memberTeamIds.length > 0) {
                const { data: mt, error: mtErr } = await supabaseAdmin
                    .from('teams')
                    .select('*')
                    .in('id', memberTeamIds)
                    .order('created_at', { ascending: false });

                if (mtErr) throw mtErr;
                memberTeams = mt || [];
            }

            // Merge unique by ID
            const map = new Map<string, any>();
            [...(owned || []), ...memberTeams].forEach((t) => map.set(t.id, t));
            const rawTeams = Array.from(map.values()).sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );

            const enriched = await enrichTeams(rawTeams);
            return NextResponse.json(enriched);
        }

        // --- DISCOVER filter ---
        if (!userId) {
            // Guest: show all open teams
            const { data, error } = await supabaseAdmin
                .from('teams')
                .select('*')
                .eq('status', 'open')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return NextResponse.json(await enrichTeams(data || []));
        }

        // Exclude: teams I applied to (pending/accepted)
        const { data: apps } = await supabaseAdmin
            .from('team_applications')
            .select('team_id')
            .eq('applicant_id', userId)
            .in('status', ['pending', 'accepted']);

        // Exclude: teams I'm already a member of
        const { data: myMemberships } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);

        const excludedIds = Array.from(new Set([
            ...(apps || []).map((a: any) => a.team_id),
            ...(myMemberships || []).map((m: any) => m.team_id),
        ]));

        let query = supabaseAdmin
            .from('teams')
            .select('*')
            .eq('status', 'open')
            .neq('creator_id', userId)
            .order('created_at', { ascending: false });

        if (excludedIds.length > 0) {
            query = query.not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(await enrichTeams(data || []));
    } catch (error) {
        console.error('Server error fetching teams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/teams
 * Creates a new team and adds creator as admin in team_members.
 */
export async function POST(req: Request) {
    const authEmail = await requireAuthEmail(req);

    try {
        const body = await req.json();
        const { creatorId, title, description, eventName, rolesNeeded, skillsRequired } = body;

        if (!creatorId || !title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (authEmail && creatorId !== authEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1) Create team
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({
                creator_id: creatorId,
                title,
                description,
                event_name: eventName,
                roles_needed: rolesNeeded || [],
                skills_required: skillsRequired || [],
                status: 'open',
            })
            .select()
            .single();

        if (teamError) {
            console.error('Error creating team:', teamError);
            return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
        }

        // 2) Add creator as admin member — CRITICAL: this enables dashboard access and member count = 1
        const { error: memberError } = await supabaseAdmin
            .from('team_members')
            .upsert(
                { team_id: team.id, user_id: creatorId, role: 'admin' },
                { onConflict: 'team_id,user_id' }
            );

        if (memberError) {
            console.error('CRITICAL: Failed to add creator to team_members:', memberError);
            // Try plain insert as fallback
            await supabaseAdmin
                .from('team_members')
                .insert({ team_id: team.id, user_id: creatorId, role: 'admin' });
        }

        // Return with member_count = 1 immediately
        return NextResponse.json({ ...team, member_count: 1 });
    } catch (error) {
        console.error('Server error creating team:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
