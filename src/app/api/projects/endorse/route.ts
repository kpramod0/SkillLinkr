import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateReputation, REP_POINTS } from '@/lib/reputation';

export async function POST(req: Request) {
    try {
        const { targetUserId, endorserId, projectTitle } = await req.json();

        if (!targetUserId || !endorserId || !projectTitle) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (targetUserId === endorserId) {
            return NextResponse.json({ error: 'Cannot endorse yourself' }, { status: 400 });
        }

        // Check if already endorsed
        const { data: existingEndorsement } = await supabase
            .from('project_endorsements')
            .select('id')
            .eq('target_user_id', targetUserId)
            .eq('endorser_id', endorserId)
            .eq('project_identifier', projectTitle)
            .single();

        if (existingEndorsement) {
            return NextResponse.json({ error: 'Already endorsed this project' }, { status: 409 });
        }

        // Record endorsement
        const { error: insertError } = await supabase
            .from('project_endorsements')
            .insert({
                target_user_id: targetUserId,
                endorser_id: endorserId,
                project_identifier: projectTitle
            });

        if (insertError) {
            console.error('Endorsement insert error:', insertError);
            return NextResponse.json({ error: 'Failed to record endorsement' }, { status: 500 });
        }

        // Award reputation
        await updateReputation(targetUserId, REP_POINTS.PROJECT_ENDORSEMENT, `project_endorsed: ${projectTitle}`);

        return NextResponse.json({ success: true, message: 'Project endorsed successfully' });

    } catch (error) {
        console.error('Project endorsement error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
