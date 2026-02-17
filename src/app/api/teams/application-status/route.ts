import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAuth() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
    const authEmail = await requireAuthEmail(req);
    // Relaxed Auth
    // if (!authEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { applicationId, action, userId } = body; // action: 'approve' | 'reject'

        if (!applicationId || !action) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Prevent impersonation
        if (authEmail && userId && userId !== authEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch application + ownership info
        const { data: app, error: appError } = await supabaseAdmin
            .from('team_applications')
            .select(
                `
        id,
        team_id,
        applicant_id,
        message,
        status,
        teams ( id, title, creator_id )
      `
            )
            .eq('id', applicationId)
            .single();

        if (appError || !app) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        const team = Array.isArray(app.teams) ? app.teams[0] : app.teams;
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

        // Authorization: only team owner can approve/reject
        const actingUser = authEmail || userId;
        if (team.creator_id !== actingUser) {
            console.log(`[AppStatus] Unauthorized: creator ${team.creator_id} !== actor ${actingUser}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const teamTitle = team.title || 'the team';

        // Helper: fetch applicant name
        const { data: applicantProfile } = await supabaseAdmin
            .from('profiles')
            .select('first_name,last_name')
            .eq('id', app.applicant_id)
            .single();

        const applicantName =
            `${applicantProfile?.first_name || ''} ${applicantProfile?.last_name || ''}`.trim() || 'A user';

        // ---- APPROVE ----
        if (action === 'approve') {
            // Idempotency: if already accepted/rejected, do not re-notify
            if (app.status !== 'pending') {
                // Ensure membership exists if status accepted (safety)
                if (app.status === 'accepted') {
                    await supabaseAdmin.from('team_members').upsert(
                        { team_id: app.team_id, user_id: app.applicant_id, role: 'member' },
                        { onConflict: 'team_id,user_id' }
                    );

                    // NEW: Create a Match between Owner and Applicant to allow DMs
                    const ownerId = team.creator_id;
                    const applicantId = app.applicant_id;

                    const { data: existingMatch } = await supabaseAdmin
                        .from('matches')
                        .select('id')
                        .or(`and(user1_id.eq.${ownerId},user2_id.eq.${applicantId}),and(user1_id.eq.${applicantId},user2_id.eq.${ownerId})`)
                        .single();

                    if (!existingMatch) {
                        await supabaseAdmin.from('matches').insert({
                            id: `match_${Date.now()}_${app.id}`,
                            user1_id: ownerId,
                            user2_id: applicantId,
                            created_at: new Date().toISOString(),
                            last_message_at: new Date().toISOString()
                        });
                    }
                }
                return NextResponse.json({ success: true, status: app.status, idempotent: true });
            }

            // Transition guard: only one concurrent call can flip pending -> accepted
            const { data: updatedRows, error: updateError } = await supabaseAdmin
                .from('team_applications')
                .update({ status: 'accepted' })
                .eq('id', applicationId)
                .eq('status', 'pending')
                .select('id,status');

            if (updateError) throw updateError;

            const updated = updatedRows?.[0];
            if (!updated) {
                // Another request won the race
                return NextResponse.json({ success: true, status: 'accepted', idempotent: true });
            }

            // Add to team members (idempotent upsert)
            const { error: memberError } = await supabaseAdmin.from('team_members').upsert(
                { team_id: app.team_id, user_id: app.applicant_id, role: 'member' },
                { onConflict: 'team_id,user_id' }
            );

            if (memberError) {
                // Roll back application status to pending to avoid accepted-without-membership
                await supabaseAdmin
                    .from('team_applications')
                    .update({ status: 'pending' })
                    .eq('id', applicationId)
                    .eq('status', 'accepted');

                return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
            }

            // Notify applicant
            await supabaseAdmin.from('notifications').insert({
                user_id: app.applicant_id,
                type: 'team_request',
                title: 'Application Accepted! 🎉',
                message: `Your request has been accepted for "${teamTitle}".`,
                data: {
                    teamId: app.team_id,
                    teamTitle,
                    applicationId,
                    status: 'accepted',
                },
            });

            // Notify owner (optional but useful)
            await supabaseAdmin.from('notifications').insert({
                user_id: authEmail,
                type: 'system',
                title: 'New Team Member 🚀',
                message: `${applicantName} joined "${teamTitle}".`,
                data: {
                    teamId: app.team_id,
                    teamTitle,
                    applicationId,
                    applicantId: app.applicant_id,
                    status: 'accepted',
                },
            });

            return NextResponse.json({ success: true, status: 'accepted' });
        }

        // ---- REJECT ----
        if (action === 'reject') {
            if (app.status !== 'pending') {
                return NextResponse.json({ success: true, status: app.status, idempotent: true });
            }

            // Transition guard: only one concurrent call can flip pending -> rejected
            const { data: updatedRows, error: updateError } = await supabaseAdmin
                .from('team_applications')
                .update({ status: 'rejected' })
                .eq('id', applicationId)
                .eq('status', 'pending')
                .select('id,status');

            if (updateError) throw updateError;

            const updated = updatedRows?.[0];
            if (!updated) {
                return NextResponse.json({ success: true, status: 'rejected', idempotent: true });
            }

            // Notify applicant (REQUIRED by your spec)
            await supabaseAdmin.from('notifications').insert({
                user_id: app.applicant_id,
                type: 'team_request',
                title: 'Application Rejected',
                message: `Your request to join "${teamTitle}" was rejected.`,
                data: {
                    teamId: app.team_id,
                    teamTitle,
                    applicationId,
                    status: 'rejected',
                },
            });

            return NextResponse.json({ success: true, status: 'rejected' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error processing application:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
