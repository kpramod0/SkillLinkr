import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic'; // Ensure fresh data

export async function GET() {
    try {
        // Fetch all profiles with their professional details
        // Note: For a very large app, we would use a dedicated 'skills' table or an RPC function.
        // For MVP with <1000 users, js processing is fine.
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('professionalDetails');

        if (error) throw error;

        const skillCounts: Record<string, number> = {};

        profiles?.forEach((profile) => {
            const skills = profile.professionalDetails?.skills || [];
            if (Array.isArray(skills)) {
                // Handle new 'Skill' object structure or legacy strings
                skills.forEach((skill: any) => {
                    // Skill can be string (legacy) or object { name, level }
                    const skillName = typeof skill === 'string' ? skill : skill?.name;

                    if (skillName) {
                        // Normalize: Capitalize first letter, trim
                        const normalized = skillName.trim();
                        if (normalized) {
                            skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
                        }
                    }
                });
            }
        });

        // Convert to array and sort
        const sortedSkills = Object.entries(skillCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // Top 20

        return NextResponse.json(sortedSkills);

    } catch (error) {
        console.error('Error fetching trending skills:', error);
        return NextResponse.json({ error: 'Failed to fetch trending skills' }, { status: 500 });
    }
}
