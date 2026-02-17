import { NextResponse } from 'next/server';
import { otps } from '@/lib/db-helpers';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if user exists in profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', email)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(email, otp);

        console.log(`\n=============================\nRESET OTP for ${email}: ${otp}\n=============================\n`);

        return NextResponse.json({
            message: 'Verification code sent',
            devOtp: otp
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
