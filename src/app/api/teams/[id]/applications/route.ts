import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Checks if userId is an admin of the team.
 * Checks BOTH team_members.role (for members) AND teams.creator_id (for creators).
 * This handles cases where the creator was never inserted into team_members.
 */
async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
    // Check 1: Is this user in team_members with an admin role?
    const { data: memberRow } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .maybeSingle();

    if (memberRow && ['admin', 'Leader', 'creator'].includes(memberRow.role)) {
        return true;
    }

    // Check 2 (fallback): Is this user the creator of the team?
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('creator_id')
        .eq('id', teamId)
        .maybeSingle();

    if (team?.creator_id === userId) {
        // Auto-repair: ensure creator is in team_members
        await supabaseAdmin.from('team_members').upsert(
            { team_id: teamId, user_id: userId, role: 'admin' },
            { onConflict: 'team_id,user_id' }
        );
        return true;
    }

    return false;
}

/**
 * GET /api/teams/[id]/applications
 * Returns all pending applications for a team with applicant profiles.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;

    try {
        const { data: applications, error: appsError } = await supabaseAdmin
            .from('team_applications')
            .select('id, created_at, applicant_id, message, status')
            .eq('team_id', teamId)
            .eq('status', 'pending');

        if (appsError) {
            console.error('Error fetching applications:', appsError);
            return NextResponse.json({ error: appsError.message }, { status: 500 });
        }

        if (!applications || applications.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch profiles for applicants
        const applicantIds = applications.map((a: any) => a.applicant_id);
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, photos, bio')
            .in('id', applicantIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const applicationsWithProfiles = applications.map((app: any) => {
            const profile: any = profileMap.get(app.applicant_id);
            return {
                ...app,
                user1_id: app.applicant_id,
                profiles: profile ? {
                    id: profile.id,
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    photos: profile.photos || [],
                    headline: profile.bio || ''
                } : {
                    id: app.applicant_id,
                    first_name: app.applicant_id.split('@')[0],
                    last_name: '',
                    photos: [],
                    headline: ''
                }
            };
        });

        return NextResponse.json(applicationsWithProfiles);
    } catch (e: any) {
        console.error('Error fetching applications:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/teams/[id]/applications
 * Accepts or rejects a pending application.
 * Body: { userId (admin), applicationId, action: 'accept'|'reject', targetUserId (applicant) }
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId, applicationId, action, targetUserId } = body;

    if (!userId || !action || !targetUserId) {
        return NextResponse.json(
            { error: `Missing required fields. Got: userId=${userId}, action=${action}, targetUserId=${targetUserId}` },
            { status: 400 }
        );
    }

    if (!['accept', 'reject'].includes(action)) {
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    // Verify the requester is an admin (checks both team_members AND creator_id)
    const adminCheck = await isTeamAdmin(teamId, userId);
    if (!adminCheck) {
        return NextResponse.json(
            { error: `Unauthorized: User ${userId} is not an admin of team ${teamId}` },
            { status: 403 }
        );
    }

    try {
        if (action === 'accept') {
            // 1. Mark application as accepted
            const { error: appError } = await supabaseAdmin
                .from('team_applications')
                .update({ status: 'accepted' })
                .eq('team_id', teamId)
                .eq('applicant_id', targetUserId);

            if (appError) {
                console.error('Error accepting application:', appError);
                return NextResponse.json({ error: appError.message }, { status: 500 });
            }

            // 2. Add applicant to team_members as 'member'
            // NOTE: DB constraint requires lowercase 'member' (not 'Member')
            const { error: memberError } = await supabaseAdmin
                .from('team_members')
                .upsert(
                    { team_id: teamId, user_id: targetUserId, role: 'member' },
                    { onConflict: 'team_id,user_id' }
                );

            if (memberError) {
                console.error('Error adding accepted member to team_members:', memberError);
                return NextResponse.json({ error: memberError.message }, { status: 500 });
            }

        } else if (action === 'reject') {
            const { error } = await supabaseAdmin
                .from('team_applications')
                .update({ status: 'rejected' })
                .eq('team_id', teamId)
                .eq('applicant_id', targetUserId);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error processing application:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
