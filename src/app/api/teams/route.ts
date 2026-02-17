import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// --- Auth Client (Lightweight) ---
// Only used to validate JWT and get user identity.
// Doesn't need service role privileges.
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
});

/**
 * Validates the request's Bearer token and returns the user's email.
 * This ensures that subsequent actions are performed on behalf of a verified user.
 */
async function requireAuthEmail(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user?.email) return null;
    return data.user.email;
}

/**
 * Helper to format an array of IDs for PostgREST `not.in` filter.
 * Handles both number and string IDs safely.
 */
function asInList(ids: Array<string | number>) {
    // PostgREST expects strings quoted for `in.(...)`
    return `(${ids
        .map((id) => (typeof id === 'number' ? `${id}` : `"${String(id).replace(/"/g, '\\"')}"`))
        .join(',')})`;
}

/**
 * GET Handler
 * Supports two modes via 'filter' query param:
 * 1. 'discover': Shows open teams that I can join (excludes my own, ones I applied to, or am member of).
 * 2. 'mine': Shows teams I created or am a member of.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId'); // optional
    const filter = searchParams.get('filter') || 'discover'; // 'discover' | 'mine'

    const authEmail = await requireAuthEmail(req);
    const userId = authEmail || userIdParam || null;

    // Security: If caller is authenticated, do not allow impersonation via query param
    if (authEmail && userIdParam && userIdParam !== authEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Base selection with relations
        const baseSelect = `
      *,
      creator: creator_id (id, first_name, last_name, photos, short_bio: bio),
      members: team_members (
        user: user_id (*)
      )
    `;

        // Case 1: Guest discovery (Unauthenticated)
        // Just show all open teams
        if (!userId) {
            const { data, error } = await supabaseAdmin
                .from('teams')
                .select(baseSelect)
                .eq('status', 'open')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json(data || []);
        }

        // Case 2: 'Mine' Filter (My Teams)
        // Returns union of: Teams I created + Teams I joined
        if (filter === 'mine') {
            // A. Find team IDs where I am a member
            const { data: memberRows, error: memberErr } = await supabaseAdmin
                .from('team_members')
                .select('team_id')
                .eq('user_id', userId);

            if (memberErr) throw memberErr;

            const memberTeamIds = (memberRows || []).map((r) => r.team_id);

            // B. Fetch teams I created (Owner)
            const { data: owned, error: ownedErr } = await supabaseAdmin
                .from('teams')
                .select(baseSelect)
                .eq('creator_id', userId)
                .order('created_at', { ascending: false });

            if (ownedErr) throw ownedErr;

            // C. Fetch teams from (A) where I am just a member
            let memberTeams: any[] = [];
            if (memberTeamIds.length > 0) {
                const { data: mt, error: mtErr } = await supabaseAdmin
                    .from('teams')
                    .select(baseSelect)
                    .in('id', memberTeamIds)
                    .order('created_at', { ascending: false });

                if (mtErr) throw mtErr;
                memberTeams = mt || [];
            }

            // D. Merge unique by ID (in case I am both creator and member, theoretically)
            const map = new Map<string | number, any>();
            [...(owned || []), ...memberTeams].forEach((t) => map.set(t.id, t));
            const merged = Array.from(map.values()).sort((a, b) => {
                const ta = new Date(a.created_at || 0).getTime();
                const tb = new Date(b.created_at || 0).getTime();
                return tb - ta;
            });

            return NextResponse.json(merged);
        }

        // Case 3: 'Discover' Filter (Find new teams)
        // MUST EXCLUDE:
        // - Teams I own
        // - Teams I have applied to (pending/accepted)
        // - Teams I am already a member of
        let query = supabaseAdmin
            .from('teams')
            .select(baseSelect)
            .eq('status', 'open')
            .neq('creator_id', userId) // Exclude owned
            .order('created_at', { ascending: false });

        // A. Find applications to exclude
        const { data: apps, error: appsErr } = await supabaseAdmin
            .from('team_applications')
            .select('team_id,status')
            .eq('applicant_id', userId)
            .in('status', ['pending', 'accepted']);

        if (appsErr) throw appsErr;

        const appliedIds = (apps || []).map((a) => a.team_id);

        // B. Find memberships to exclude
        const { data: members, error: memErr } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);

        if (memErr) throw memErr;

        const memberIds = (members || []).map((m) => m.team_id);

        // C. Apply Exclusion
        const excludedIds = Array.from(new Set([...appliedIds, ...memberIds]));

        if (excludedIds.length > 0) {
            // Use helper to format list for PostgREST
            query = query.not('id', 'in', asInList(excludedIds));
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Server error fetching teams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST Handler
 * Creates a new team and automatically adds the creator as the first admin member.
 */
export async function POST(req: Request) {
    const authEmail = await requireAuthEmail(req);
    // Note: We allow !authEmail here to support custom auth flow (checking creatorId in body)
    // if (!authEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { creatorId, title, description, eventName, rolesNeeded, skillsRequired } = body;

        // Basic validation
        if (!creatorId || !title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Security: Prevent impersonation ONLY if authenticated
        if (authEmail && creatorId !== authEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1) Create team record
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({
                creator_id: creatorId,
                title,
                description,
                event_name: eventName,
                roles_needed: rolesNeeded || [],
                skills_required: skillsRequired || [],
                status: 'open',
            })
            .select()
            .single();

        if (teamError) {
            console.error('Error creating team:', teamError);
            return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
        }

        // 2) Add creator as member (idempotent)
        // This ensures the creator immediately has access to the team chat and dashboard
        const { error: memberError } = await supabaseAdmin
            .from('team_members')
            .upsert(
                { team_id: team.id, user_id: creatorId, role: 'admin' },
                { onConflict: 'team_id,user_id' }
            );

        if (memberError) {
            console.error('Error adding creator to team:', memberError);
            // Non-blocking error: Team was created, but membership failed.
            // Client might need to retry joining or backend should rollback (advanced).
        }

        return NextResponse.json(team);
    } catch (error) {
        console.error('Server error creating team:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
