import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseKey);
}

// Helper to check admin status
// Returns true if user is a member with an admin role, OR if they are the original creator
async function isTeamAdmin(teamId: string, userId: string) {
    const supabase = getSupabase();

    // Check team_members table first
    const { data: memberData } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

    if (memberData && ['admin', 'Leader', 'creator', 'member'].includes(memberData.role)) {
        // Check if specifically admin role
        if (['admin', 'Leader', 'creator'].includes(memberData.role)) return true;
    }

    // Fallback: Check if user is the team creator (for old teams without trigger)
    const { data: teamData } = await supabase
        .from('teams')
        .select('creator_id')
        .eq('id', teamId)
        .single();

    if (teamData && teamData.creator_id === userId) {
        // Auto-repair: ensure creator is in team_members as admin
        await supabase.from('team_members').upsert(
            { team_id: teamId, user_id: userId, role: 'admin' },
            { onConflict: 'team_id,user_id' }
        );
        return true;
    }

    return false;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const teamId = (await params).id;
        const supabase = getSupabase();

        // Fetch team with creator profile (simple join - avoids potential alias issues)
        const { data: team, error } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();

        if (error) {
            console.error('Supabase Error fetching team:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        // Fetch creator profile separately to avoid FK join failures
        let creator = null;
        if (team.creator_id) {
            const { data: creatorData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, photos, bio')
                .eq('id', team.creator_id)
                .single();
            if (creatorData) {
                creator = { ...creatorData, short_bio: creatorData.bio };
            }
        }

        // Fetch member count
        const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);

        // AUTO-REPAIR: If creator has no member row, insert them now
        // This silently fixes all legacy teams without running a manual SQL script
        if ((count ?? 0) === 0 && team.creator_id) {
            await supabase.from('team_members').upsert(
                { team_id: teamId, user_id: team.creator_id, role: 'admin' },
                { onConflict: 'team_id,user_id' }
            );
        } else if (team.creator_id) {
            // Check if creator specifically is missing (team has other members but not creator)
            const { data: creatorMember } = await supabase
                .from('team_members')
                .select('user_id')
                .eq('team_id', teamId)
                .eq('user_id', team.creator_id)
                .maybeSingle();
            if (!creatorMember) {
                await supabase.from('team_members').upsert(
                    { team_id: teamId, user_id: team.creator_id, role: 'admin' },
                    { onConflict: 'team_id,user_id' }
                );
            }
        }

        // Re-fetch member count after potential repair
        const { count: finalCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);

        return NextResponse.json({ ...team, creator, member_count: finalCount ?? 0 });

    } catch (e: any) {
        console.error('Critical error fetching team:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { userId, title, description, roles_needed, skills_required, status } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Admin
    const isAdmin = await isTeamAdmin(teamId, userId);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    // Update (note: 'updated_at' column does not exist in schema, so excluded)
    const { data, error } = await getSupabase()
        .from('teams')
        .update({
            title,
            description,
            roles_needed,
            skills_required,
            status,
        })
        .eq('id', teamId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
}
