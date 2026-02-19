import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

// Helper to validate auth token and return email
async function requireAuthEmail(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email) return null;
    return data.user.email;
}

/**
 * GET /api/teams/[id]/invite
 * Returns (or creates) an invite token for the team.
 * Only admins/creators can generate invite links.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId && !request.headers.get('authorization')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authEmail = await requireAuthEmail(request);
    const requestingUser = authEmail || userId;

    if (!requestingUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('id, title, creator_id, invite_token')
        .eq('id', teamId)
        .single();

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCreator = team.creator_id === requestingUser;
    const { data: memberRecord } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', requestingUser)
        .single();

    const isAdmin = isCreator || ['admin', 'Leader', 'creator'].includes(memberRecord?.role || '');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });

    // Generate or return existing invite token
    let inviteToken = team.invite_token;
    if (!inviteToken) {
        inviteToken = crypto.randomUUID();
        await supabaseAdmin.from('teams').update({ invite_token: inviteToken }).eq('id', teamId);
    }

    return NextResponse.json({ invite_token: inviteToken, team_id: teamId, team_title: team.title });
}

/**
 * POST /api/teams/[id]/invite
 * Directly join a team using an invite token (skips application step).
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { userId, invite_token } = await request.json();

    if (!userId || !invite_token) {
        return NextResponse.json({ error: 'Missing userId or invite_token' }, { status: 400 });
    }

    // Validate invite token
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('id, title, creator_id, invite_token, status')
        .eq('id', teamId)
        .single();

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (team.invite_token !== invite_token) return NextResponse.json({ error: 'Invalid invite link' }, { status: 403 });
    if (team.status === 'closed') return NextResponse.json({ error: 'Team is no longer accepting members' }, { status: 400 });

    // Check if already a member
    const { data: existing } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

    if (existing) return NextResponse.json({ message: 'Already a member', already_member: true });

    // Add to team directly (invite link bypasses application flow)
    const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({ team_id: teamId, user_id: userId, role: 'member' });

    if (memberError) {
        console.error('Error joining team via invite:', memberError);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Mark any pending application as accepted
    await supabaseAdmin
        .from('team_applications')
        .update({ status: 'accepted' })
        .eq('team_id', teamId)
        .eq('applicant_id', userId)
        .eq('status', 'pending');

    return NextResponse.json({ success: true, team_id: teamId, team_title: team.title });
}
