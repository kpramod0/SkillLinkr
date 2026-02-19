import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/teams/[id]/members
 * Returns all members of a team with their profiles.
 * Uses supabaseAdmin to bypass RLS — auth validation handled in the dashboard.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;

    try {
        const { data: members, error: membersError } = await supabaseAdmin
            .from('team_members')
            .select('role, joined_at, user_id')
            .eq('team_id', teamId);

        if (membersError) {
            console.error('Error fetching team members:', membersError);
            return NextResponse.json({ error: membersError.message }, { status: 500 });
        }

        if (!members || members.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch profiles for all member user_ids
        const userIds = members.map((m: any) => m.user_id);
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, photos, bio')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching member profiles:', profilesError);
        }

        // Merge members with their profiles
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        const membersWithProfiles = members.map((member: any) => {
            const profile: any = profileMap.get(member.user_id);
            return {
                ...member,
                profiles: profile ? {
                    id: profile.id,
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    email: profile.id,
                    photos: profile.photos || [],
                    headline: profile.bio || ''
                } : {
                    id: member.user_id,
                    first_name: member.user_id.split('@')[0],
                    last_name: '',
                    email: member.user_id,
                    photos: [],
                    headline: ''
                }
            };
        });

        return NextResponse.json(membersWithProfiles);
    } catch (e: any) {
        console.error('Critical error in members GET:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/teams/[id]/members
 * Promotes a member to admin. Uses supabaseAdmin to bypass RLS.
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { userId, targetUserId, newRole } = await request.json();

    if (!userId || !targetUserId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if requester is admin
    const { data: requesterRecord } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

    // Also check if they are the team creator
    const { data: teamRecord } = await supabaseAdmin
        .from('teams')
        .select('creator_id')
        .eq('id', teamId)
        .single();

    const isCreator = teamRecord?.creator_id === userId;
    const isAdmin = isCreator || ['admin', 'Leader', 'creator'].includes(requesterRecord?.role);

    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', targetUserId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}

/**
 * DELETE /api/teams/[id]/members
 * Removes a member from the team. Uses supabaseAdmin to bypass RLS.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetUserId = searchParams.get('targetUserId');

    if (!userId || !targetUserId) {
        return NextResponse.json({ error: 'Missing userId or targetUserId' }, { status: 400 });
    }

    // If removing someone else, must be admin
    if (userId !== targetUserId) {
        const { data: requesterRecord } = await supabaseAdmin
            .from('team_members')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', userId)
            .single();

        const { data: teamRecord } = await supabaseAdmin
            .from('teams')
            .select('creator_id')
            .eq('id', teamId)
            .single();

        const isCreator = teamRecord?.creator_id === userId;
        const isAdmin = isCreator || ['admin', 'Leader', 'creator'].includes(requesterRecord?.role);

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    const { error } = await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', targetUserId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
