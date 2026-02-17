import { NextResponse } from 'next/server';
import { otps, verified } from '@/lib/db-helpers';

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const storedOtp = otps.get(email);

        if (!storedOtp || storedOtp !== otp) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Verify user
        verified.add(email);
        // Cleanup OTP
        otps.delete(email);

        return NextResponse.json({ message: 'Account verified successfully' });
    } catch (error) {
        console.error('Verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
