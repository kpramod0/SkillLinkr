import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }
    return createClient(supabaseUrl, supabaseKey);
}

// Helper
async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
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
        const supabase = getSupabaseClient();
        // Step 1: Fetch pending applications from team_applications table
        const { data: applications, error: appsError } = await supabase
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

        // Step 2: Fetch profiles for all applicants
        const applicantIds = applications.map(a => a.applicant_id);
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, photos, bio')
            .in('id', applicantIds);

        if (profilesError) {
            console.error('Error fetching applicant profiles:', profilesError);
        }

        // Step 3: Merge applications with profiles
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        const applicationsWithProfiles = applications.map(app => {
            const profile = profileMap.get(app.applicant_id);
            return {
                ...app,
                user1_id: app.applicant_id, // For backward compatibility with dashboard UI
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

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const teamId = (await params).id;
    const { userId, applicationId, action, targetUserId } = await request.json();

    if (!userId || !action || !targetUserId) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify Admin
    if (!(await isTeamAdmin(teamId, userId))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const supabase = getSupabaseClient();
        if (action === 'accept') {
            // 1. Update application status
            const { error: appError } = await supabase
                .from('team_applications')
                .update({ status: 'accepted' })
                .eq('team_id', teamId)
                .eq('applicant_id', targetUserId);

            if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

            // 2. Add to team_members
            const { error: memberError } = await supabase
                .from('team_members')
                .upsert({
                    team_id: teamId,
                    user_id: targetUserId,
                    role: 'member'  // must be lowercase to match DB CHECK constraint
                }, { onConflict: 'team_id,user_id' });

            if (memberError) {
                console.error('Error adding member to team:', memberError);
                return NextResponse.json({ error: memberError.message }, { status: 500 });
            }

        } else if (action === 'reject') {
            const { error } = await supabase
                .from('team_applications')
                .update({ status: 'rejected' })
                .eq('team_id', teamId)
                .eq('applicant_id', targetUserId);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error processing application action:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
