import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/db-helpers';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('onboarding_completed', true);

        if (error) {
            console.error('Error fetching profiles:', error);
            return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
        }

        const profiles = (data || []).map(rowToProfile);
        return NextResponse.json(profiles);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }
}
