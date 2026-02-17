
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Helper to get Supabase client
function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseKey);
}

export async function GET(req: Request) {
    try {
        const supabase = getSupabase();
        // Fetch from Supabase
        const { data: hackathons, error } = await supabase
            .from('hackathons')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) {
            console.error("Supabase error fetching hackathons:", error);
            // Fallback to mock data if table doesn't exist or errors (for demo purposes)
            return NextResponse.json(getMockHackathons());
        }

        // If table is empty, return mock data so user sees something
        if (!hackathons || hackathons.length === 0) {
            return NextResponse.json(getMockHackathons());
        }

        return NextResponse.json(hackathons);

    } catch (error) {
        console.error("Error fetching hackathons:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Mock Data Generator for immediate feedback
function getMockHackathons() {
    return [
        {
            id: '1',
            title: 'Smart India Hackathon 2026',
            description: 'World’s biggest open innovation model to solve real-world problems.',
            start_date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
            end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
            registration_link: 'https://sih.gov.in',
            image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
            tags: ['Innovation', 'Government', 'Coding'],
            location: 'Hybrid',
            organizer: 'Govt of India'
        },
        {
            id: '2',
            title: 'HackTheNorth 2026',
            description: 'Canada’s biggest hackathon, now global.',
            start_date: new Date(Date.now() + 86400000 * 20).toISOString(),
            end_date: new Date(Date.now() + 86400000 * 22).toISOString(),
            registration_link: 'https://hackthenorth.com',
            image_url: 'https://images.unsplash.com/photo-1504384308090-c54be3855833?w=800&q=80',
            tags: ['AI', 'Global', 'Students'],
            location: 'Waterloo, CA',
            organizer: 'Tech North'
        },
        {
            id: '3',
            title: 'KIIT Fest Hack 5.0',
            description: 'The annual flagship hackathon of KIIT University.',
            start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
            end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
            registration_link: 'https://kiitfest.org',
            image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
            tags: ['University', 'Beginner Friendly', 'Fun'],
            location: 'Bhubaneswar, IN',
            organizer: 'KIIT Student Activity Centre'
        }
    ];
}
