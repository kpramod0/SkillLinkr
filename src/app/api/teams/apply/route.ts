import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

// Lightweight auth client
function getSupabaseAuth() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

async function requireAuthEmail(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const { data, error } = await getSupabaseAuth().auth.getUser(token);
    if (error || !data?.user?.email) return null;
    return data.user.email;
}

export async function POST(req: Request) {
    let applicantId = await requireAuthEmail(req);

    // Fallback: If no JWT, check body for userId (Custom Auth)
    // We need to clone the request to read body without consuming it for later
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!applicantId) {
        if (body.userId) {
            applicantId = body.userId;
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const { teamId, message } = body;

        if (!teamId) {
            return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
        }

        // Fetch team
        const { data: team, error: teamErr } = await supabaseAdmin
            .from('teams')
            .select('id,title,creator_id,status')
            .eq('id', teamId)
            .single();

        if (teamErr || !team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        if (team.creator_id === applicantId) {
            return NextResponse.json({ error: 'Cannot apply to your own team' }, { status: 400 });
        }

        if (team.status !== 'open') {
            return NextResponse.json({ error: 'Team is not recruiting' }, { status: 400 });
        }

        // Check if applicant profile exists (Prevent FK violation)
        const { data: applicantProfile } = await supabaseAdmin
            .from('profiles')
            .select('first_name,last_name')
            .eq('id', applicantId)
            .single();

        if (!applicantProfile) {
            return NextResponse.json({ error: 'Profile not found. Please complete your profile.' }, { status: 404 });
        }

        const applicantName =
            `${applicantProfile?.first_name || ''} ${applicantProfile?.last_name || ''}`.trim() || 'Someone';


        const { data: existing, error: existingErr } = await supabaseAdmin
            .from('team_applications')
            .select('id,status')
            .eq('team_id', teamId)
            .eq('applicant_id', applicantId)
            .limit(1);

        if (existingErr) {
            console.error("Error checking existing application:", existingErr);
            throw existingErr;
        }

        const existingRow = existing?.[0];

        // Block duplicates for pending/accepted
        if (existingRow?.status === 'pending' || existingRow?.status === 'accepted') {
            return NextResponse.json(
                { error: 'Application already exists', status: existingRow.status, applicationId: existingRow.id },
                { status: 409 }
            );
        }

        // Upsert: if rejected -> becomes pending again, else create pending
        console.log("Upserting application for", teamId, applicantId);
        const { data: appRows, error: appErr } = await supabaseAdmin
            .from('team_applications')
            .upsert(
                {
                    // If a unique constraint exists on (team_id, applicant_id), this is safe and race-resistant.
                    team_id: teamId,
                    applicant_id: applicantId,
                    status: 'pending',
                    message: message || null,
                },
                { onConflict: 'team_id,applicant_id' }
            )
            .select('id,team_id,applicant_id,status,message');

        if (appErr) {
            console.error("Upsert error:", appErr);
            throw appErr;
        }

        const application = appRows?.[0];
        if (!application?.id) throw new Error('Failed to create application');

        // Instant actionable notification to Team Owner
        console.log("Sending notification to", team.creator_id);
        const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
            user_id: team.creator_id,
            type: 'team_request',
            title: 'New Team Request 👥',
            message: `${applicantName} requested to join "${team.title}".`,
            data: {
                teamId: team.id,
                teamTitle: team.title,
                applicationId: application.id,
                applicantId,
                status: 'pending',
                message: message || null,
            },
        });

        if (notifErr) console.error("Notification error:", notifErr); // Don't block flow

        return NextResponse.json({ success: true, applicationId: application.id });
    } catch (error) {
        console.error('Error applying to team:', error);
        // @ts-ignore
        return NextResponse.json({ error: 'Internal Server Error', details: error?.message || String(error) }, { status: 500 });
    }
}
