import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function requireAuthEmail(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user?.email) return null;
    return data.user.email;
}

function toProfileShape(p: any) {
    return {
        id: p.id,
        personal: {
            firstName: p.first_name || p.personal?.firstName || '',
            lastName: p.last_name || p.personal?.lastName || '',
            age: p.age || p.personal?.age || 0
        },
        visuals: {
            photos: p.photos || p.visuals?.photos || [],
            bio: p.bio || p.visuals?.bio || ''
        },
        professionalDetails: {
            domains: p.domains || p.professionalDetails?.domains || [],
            year: p.year || p.professionalDetails?.year || '1st'
        },
    };
}

export async function GET(req: Request) {
    const authEmail = await requireAuthEmail(req);
    // Relaxed Auth: Allow query param if no JWT
    // if (!authEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = authEmail || userIdParam;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // --- Incoming likes (people) ---
        const { data: matches } = await supabaseAdmin
            .from('matches')
            .select('user1_id,user2_id')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        const matchedSet = new Set(
            (matches || []).map((m) => (m.user1_id === userId ? m.user2_id : m.user1_id))
        );

        const { data: swipes, error: swErr } = await supabaseAdmin
            .from('swipes')
            .select('swiper_id,target_id,action,message,created_at')
            .eq('target_id', userId)
            .eq('action', 'like');

        if (swErr) throw swErr;

        const incomingLikeUserIds = (swipes || [])
            .map((s) => s.swiper_id)
            .filter((sid) => sid && !matchedSet.has(sid));

        let likeProfiles: any[] = [];
        if (incomingLikeUserIds.length > 0) {
            const { data: profs } = await supabaseAdmin.from('profiles').select('*').in('id', incomingLikeUserIds);
            likeProfiles = profs || [];
        }

        const likeRequests = (swipes || [])
            .filter((s) => s.swiper_id && !matchedSet.has(s.swiper_id))
            .map((s) => {
                const p = likeProfiles.find((x) => x.id === s.swiper_id);
                const profile = p ? toProfileShape(p) : {
                    id: s.swiper_id,
                    personal: { firstName: '', lastName: '' },
                    visuals: { photos: [], bio: '' },
                    professionalDetails: { domains: [], year: '1st' }
                };

                return {
                    ...profile,
                    requestId: `like_${s.swiper_id}`,
                    requestType: 'like',
                    likedAt: s.created_at || new Date().toISOString(),
                    joinNote: s.message || undefined,
                };
            });

        // --- Team applications where I'm the owner ---
        const { data: myTeams, error: teamErr } = await supabaseAdmin
            .from('teams')
            .select('id,title,creator_id')
            .eq('creator_id', userId);

        if (teamErr) throw teamErr;

        const teamIdToTitle = new Map((myTeams || []).map((t) => [t.id, t.title]));
        const ownedTeamIds = (myTeams || []).map((t) => t.id);

        let teamRequests: any[] = [];
        if (ownedTeamIds.length > 0) {
            const { data: apps, error: appsErr } = await supabaseAdmin
                .from('team_applications')
                .select('id,team_id,applicant_id,message,status,created_at')
                .in('team_id', ownedTeamIds)
                .eq('status', 'pending');

            if (appsErr) throw appsErr;

            const applicantIds = [...new Set((apps || []).map((a) => a.applicant_id).filter(Boolean))];

            let applicantProfiles: any[] = [];
            if (applicantIds.length > 0) {
                const { data: profs } = await supabaseAdmin.from('profiles').select('*').in('id', applicantIds);
                applicantProfiles = profs || [];
            }

            teamRequests = (apps || []).map((a) => {
                const p = applicantProfiles.find((x) => x.id === a.applicant_id);
                const profile = p ? toProfileShape(p) : {
                    id: a.applicant_id,
                    personal: { firstName: '', lastName: '' },
                    visuals: { photos: [], bio: '' },
                    professionalDetails: { domains: [], year: '1st' }
                };

                return {
                    ...profile,
                    requestId: `teamapp_${a.id}`, // UNIQUE per application
                    requestType: 'team_application',
                    isTeamApplication: true,
                    applicationId: a.id,
                    teamId: a.team_id,
                    teamName: teamIdToTitle.get(a.team_id) || 'Team',
                    likedAt: a.created_at || new Date().toISOString(),
                    joinNote: a.message || undefined,
                };
            });
        }

        // Merge + sort newest first
        const all = [...teamRequests, ...likeRequests].sort((a, b) => {
            const ta = new Date(a.likedAt || 0).getTime();
            const tb = new Date(b.likedAt || 0).getTime();
            return tb - ta;
        });

        return NextResponse.json(all);
    } catch (error) {
        console.error('likes route error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
