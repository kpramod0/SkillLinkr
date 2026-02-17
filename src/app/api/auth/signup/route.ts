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
        const { email, password, role } = await request.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if (!email.endsWith('@kiit.ac.in')) {
            return NextResponse.json({ error: 'Only @kiit.ac.in emails are allowed' }, { status: 400 });
        }

        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        if (!role || !['student', 'faculty'].includes(role)) {
            return NextResponse.json({ error: 'Please select your role (Student or Faculty/Staff)' }, { status: 400 });
        }

        // Check if user already exists in profiles table
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', email)
            .single();

        if (existingProfile) {
            return NextResponse.json({
                error: 'Account already exists. Please go to Login.'
            }, { status: 409 });
        }

        // Hash the password
        const passwordHash = hashPassword(password);

        // Generate 6-digit OTP for verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(email, otp);

        console.log(`\n=============================\nOTP for ${email}: ${otp}\n=============================\n`);

        // Create profile with password hash and role
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: email,
                first_name: 'New',
                last_name: 'User',
                age: 18,
                gender: 'Other',
                year: '1st',
                role: role,
                onboarding_completed: false,
                password_hash: passwordHash
            });

        if (profileError) {
            console.error('Failed to create profile:', profileError);
            return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Verification code sent',
            devOtp: otp
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
