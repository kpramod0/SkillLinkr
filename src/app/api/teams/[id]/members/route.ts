import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseKey);
}

// Helper to check if user is admin
async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
    const { data } = await getSupabase()
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

    return ['admin', 'Leader', 'creator'].includes(data?.role);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;

    try {
        // Step 1: Fetch raw member records
        const { data: members, error: membersError } = await getSupabase()
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

        // Step 2: Fetch profiles for all member user_ids
        const userIds = members.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await getSupabase()
            .from('profiles')
            .select('id, first_name, last_name, photos, bio')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching member profiles:', profilesError);
        }

        // Step 3: Merge members with their profiles
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        const membersWithProfiles = members.map(member => {
            const profile = profileMap.get(member.user_id);
            return {
                ...member,
                profiles: profile ? {
                    id: profile.id,
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    email: profile.id, // ID is the email

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

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { userId, targetUserId, newRole } = await request.json();

    if (!userId || !targetUserId || !newRole) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auth Change: Verify requester is admin
    if (!(await isTeamAdmin(teamId, userId))) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Perform update
    // Perform update
    const { error } = await getSupabase()
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', targetUserId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}

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

    // Logic: Admin can kick anyone. Member can leave (kick self).
    const isAdmin = await isTeamAdmin(teamId, userId);

    if (userId !== targetUserId && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If leaving, check if last admin? (Optional safety)

    const { error } = await getSupabase()
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', targetUserId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
