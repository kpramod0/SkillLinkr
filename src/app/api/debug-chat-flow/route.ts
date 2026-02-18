import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const logs: any[] = [];
    const addLog = (step: string, details: any) => logs.push({ step, details, time: new Date().toISOString() });

    try {
        addLog('Start', 'Received request');

        // 1. Check Header
        const authHeader = req.headers.get('authorization') || '';
        addLog('Header Check', {
            exists: !!authHeader,
            length: authHeader.length,
            startsWithBearer: authHeader.startsWith('Bearer ')
        });

        // 2. Validate Token with Supabase
        let userClient = null;
        let userId = null;
        let email = null;

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const sb = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } }
            );

            const { data, error } = await sb.auth.getUser();
            addLog('Auth Verification', {
                success: !error,
                error: error?.message,
                email: data?.user?.email,
                id: data?.user?.id
            });

            if (data?.user) {
                userClient = sb;
                userId = data.user.email; // We use email as ID in this app
                email = data.user.email;
            }
        } else {
            addLog('Auth Skipping', 'No Bearer token found');
        }

        // 3. Fallback to Param if needed
        if (!userId) {
            const { searchParams } = new URL(req.url);
            userId = searchParams.get('userId');
            addLog('UserId Fallback', { fromParam: userId });
        }

        // 4. Select DB Client
        const db = userClient || supabaseAdmin;
        const isUserClient = !!userClient;
        const isAdminClient = db === supabaseAdmin;

        addLog('Client Selection', {
            isUserClient,
            isAdminClient,
            hasFrom: typeof db?.from === 'function',
            dbIsDefined: !!db
        });

        // 5. Full Logic Simulation
        if (db && typeof db.from === 'function') {
            // A. Matches
            const { data: matches, error: matchErr } = await db
                .from('matches')
                .select('*')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
                .order('last_message_at', { ascending: false, nullsFirst: false })
                .limit(5);

            addLog('Query: Matches', {
                success: !matchErr,
                error: matchErr,
                count: matches?.length,
                firstId: matches?.[0]?.id
            });

            // B. Profiles (if matches exist)
            if (matches && matches.length > 0) {
                const friendIds = matches.map((m: any) => (m.user1_id === userId ? m.user2_id : m.user1_id));
                const { data: profs, error: profErr } = await db.from('profiles').select('id, email, first_name').in('id', friendIds);

                addLog('Query: Profiles', {
                    success: !profErr,
                    error: profErr,
                    requestedIds: friendIds,
                    foundCount: profs?.length,
                    foundIds: profs?.map((p: any) => p.id)
                });
            }

            // C. Teams
            const { data: teamMembers, error: tmErr } = await db
                .from('team_members')
                .select('team_id')
                .eq('user_id', userId);

            addLog('Query: TeamMembers', {
                success: !tmErr,
                error: tmErr,
                count: teamMembers?.length
            });
        } else {
            addLog('DB Query Skipped', 'No valid client');
        }

        return NextResponse.json({ success: true, logs });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message, logs });
    }
}
