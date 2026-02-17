import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === testHash;
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Fetch profile with password hash
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, onboarding_completed, password_hash')
            .eq('id', email)
            .single();

        if (error || !profile) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (!profile.password_hash) {
            return NextResponse.json({ error: 'Account has no password set. Please use Forgot Password.' }, { status: 401 });
        }

        // Verify password
        if (!verifyPassword(password, profile.password_hash)) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Update last active
        await supabase
            .from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('id', email);

        return NextResponse.json({
            success: true,
            email,
            isOnboarded: !!profile.onboarding_completed,
            session: {
                access_token: 'local_session',
                refresh_token: 'local_session',
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
