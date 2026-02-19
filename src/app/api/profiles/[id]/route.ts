import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

/**
 * GET /api/profiles/[id]
 * Returns a single user profile by their ID (email).
 * This is a public endpoint for profile sharing.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = decodeURIComponent((await params).id);

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(rowToProfile(data));
}
