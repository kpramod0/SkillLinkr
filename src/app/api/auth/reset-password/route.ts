import { NextResponse } from 'next/server';
import { otps } from '@/lib/db-helpers';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

export async function POST(request: Request) {
    try {
        const { email, otp, password } = await request.json();

        if (!email || !otp || !password) {
            return NextResponse.json({ error: 'Missing requirements' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Verify OTP
        const storedOtp = otps.get(email);
        if (!storedOtp || storedOtp !== otp) {
            return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
        }

        // Check user exists in profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', email)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // Hash new password and update
        const passwordHash = hashPassword(password);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ password_hash: passwordHash })
            .eq('id', email);

        if (updateError) {
            console.error('Failed to update password:', updateError);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        otps.delete(email);
        console.log('✅ Password updated successfully for', email);

        return NextResponse.json({ message: 'Password reset successfully' });

    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
