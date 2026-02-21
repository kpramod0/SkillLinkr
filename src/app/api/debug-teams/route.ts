import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * DEBUG ENDPOINT — remove before production release
 * Usage: GET /api/debug-teams?userId=your@email.com
 * Shows exactly what team_members and teams rows are found for a user
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Pass ?userId=your@email.com' }, { status: 400 });
    }

    const db = supabaseAdmin;
    const isAdminAvailable = !!(db && typeof db.from === 'function');

    // Check supabaseAdmin client health
    const adminKeyUsed = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role_key' : 'ANON_KEY_FALLBACK';

    // Step 1: Query team_members
    const { data: teamMembers, error: tmErr } = await db
        .from('team_members')
        .select('team_id, user_id, role, joined_at')
        .eq('user_id', userId);

    // Step 2: Get all team IDs
    const teamIds = (teamMembers || []).map((t: any) => t.team_id).filter(Boolean);

    // Step 3: Query teams
    let teams: any[] = [];
    let teamsErr: any = null;
    if (teamIds.length > 0) {
        const result = await db
            .from('teams')
            .select('id, title, created_at')
            .in('id', teamIds);
        teams = result.data || [];
        teamsErr = result.error;
    }

    return NextResponse.json({
        debug: true,
        userId,
        adminKeyUsed,
        isAdminAvailable,
        teamMembersFound: teamMembers?.length ?? 0,
        teamMembersError: tmErr ? JSON.stringify(tmErr) : null,
        teamIds,
        teamsFound: teams.length,
        teamsError: teamsErr ? JSON.stringify(teamsErr) : null,
        teams: teams.map((t: any) => ({ id: t.id, title: t.title })),
        rawTeamMembers: teamMembers,
    });
}
