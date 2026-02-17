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
async function isTeamAdmin(teamId: string, userId: string) {
    const { data, error } = await getSupabase()
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

    if (error || !data) return false;
    // Accept various admin role names
    return ['admin', 'Leader', 'creator'].includes(data.role);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const teamId = (await params).id;

        const { data: team, error } = await getSupabase()
            .from('teams')
            .select(`
                *,
                creator: creator_id (
                    id, first_name, last_name, photos, short_bio: bio
                )
            `)
            .eq('id', teamId)
            .single();

        if (error) {
            console.error('Supabase Error fetching team:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        return NextResponse.json(team);
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

    // Update
    const { data, error } = await getSupabase()
        .from('teams')
        .update({
            title,
            description,
            roles_needed,
            skills_required,
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
}
