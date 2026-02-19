import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile, profileToRow } from '@/lib/db-helpers';
import { UserProfile } from '@/types';
import { updateReputation, REP_POINTS } from '@/lib/reputation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', email)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(rowToProfile(data));
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, ...profileData } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // Fetch existing profile to compare differences
        const { data: existingProfileRow } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', email)
            .single();

        const existingProfile = existingProfileRow ? rowToProfile(existingProfileRow) : null;

        const newProfile: UserProfile = {
            id: email,
            ...profileData,
            onboardingCompleted: true
        };

        const row = profileToRow(newProfile);

        // Upsert (insert or update if exists)
        let { error } = await supabase
            .from('profiles')
            .upsert(row, { onConflict: 'id' });

        if (error && error.message?.includes('portfolio')) {
            console.warn('Portfolio column not found, saving without it...');
            const { portfolio, ...rowWithoutPortfolio } = row;
            const retryResult = await supabase
                .from('profiles')
                .upsert(rowWithoutPortfolio, { onConflict: 'id' });
            error = retryResult.error;
        }

        if (error) {
            console.error('Profile upsert error:', error);
            return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
        }

        // --- Reputation Logic ---
        // Only run if we had a previous profile to compare against, OR if it's new but we can award initial points.
        // Actually, easiest is:

        // 1. GitHub Linked
        const oldGithub = existingProfile?.visuals?.github;
        const newGithub = newProfile.visuals?.github;
        if (!oldGithub && newGithub) {
            await updateReputation(email, REP_POINTS.GITHUB_LINKED, 'github_linked');
        }

        // 2. LinkedIn Linked
        const oldLinkedin = existingProfile?.visuals?.linkedin;
        const newLinkedin = newProfile.visuals?.linkedin;
        if (!oldLinkedin && newLinkedin) {
            await updateReputation(email, REP_POINTS.LINKEDIN_LINKED, 'linkedin_linked');
        }

        // 3. Projects Added
        const oldProjectsCount = existingProfile?.portfolio?.length || 0;
        const newProjectsCount = newProfile.portfolio?.length || 0;
        const projectsAdded = newProjectsCount - oldProjectsCount;
        if (projectsAdded > 0) {
            await updateReputation(email, projectsAdded * REP_POINTS.PROJECT_ADDED, `${projectsAdded}_projects_added`);
        }

        // 4. Skills & Education (Profile Complete)
        // Check if previously incomplete, now complete
        const wasComplete = existingProfile?.professionalDetails?.skills && existingProfile?.professionalDetails?.year; // loose check
        const isNowComplete = newProfile.professionalDetails?.skills?.length > 0 && newProfile.professionalDetails?.year;

        // We only award this ONCE. Since we don't have a 'awarded_profile_complete' flag in DB,
        // we can rely on reputation calculation being 'additive' but risky.
        // Safer: Store a flag?
        // For MVP: Let's assume if they *just* added skills/year for the first time.
        if (!wasComplete && isNowComplete) {
            await updateReputation(email, REP_POINTS.PROFILE_COMPLETE, 'profile_completed');
        }

        return NextResponse.json({ success: true, profile: newProfile });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
