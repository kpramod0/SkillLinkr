import { NextResponse } from 'next/server';
import { otps } from '@/lib/db-helpers';

export async function POST(request: Request) {
    console.log("👉 API HIT: /api/auth/reset-password");
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

        // Get and TRIM the key (remove any hidden whitespace/newlines)
        const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();

        // Debug: Log key details (NOT the full key!)
        console.log('🔑 DEBUG: Key length:', serviceRoleKey.length);
        console.log('🔑 DEBUG: Key starts with:', serviceRoleKey.substring(0, 20) + '...');
        console.log('🔑 DEBUG: Key ends with:', '...' + serviceRoleKey.substring(serviceRoleKey.length - 10));
        console.log('🔑 DEBUG: URL:', supabaseUrl);

        if (!serviceRoleKey) {
            console.warn('⚠️ Missing SUPABASE_SERVICE_ROLE_KEY.');
            if (process.env.NODE_ENV === 'development') {
                otps.delete(email);
                return NextResponse.json({
                    message: 'Password reset successful (SIMULATION: no key)',
                    simulated: true
                });
            }
            return NextResponse.json({ error: 'Missing admin key' }, { status: 500 });
        }

        // ============================================================
        // APPROACH: Use direct REST API instead of JS client
        // This bypasses any potential issues with the @supabase/supabase-js client
        // ============================================================

        // Step 1: List users to find the UUID for this email
        console.log('📡 Calling Supabase Admin API directly via fetch...');

        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 List users response status:', listRes.status);

        if (!listRes.ok) {
            const errBody = await listRes.text();
            console.error('📡 List users failed:', listRes.status, errBody);

            if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Direct API also failed. Falling back to simulation.');
                otps.delete(email);
                return NextResponse.json({
                    message: 'Password reset (SIMULATION: API returned ' + listRes.status + ')',
                    simulated: true,
                    debug: { status: listRes.status, body: errBody }
                });
            }
            return NextResponse.json({ error: 'Admin API error' }, { status: 500 });
        }

        const usersData = await listRes.json();
        const users = usersData.users || usersData;
        const user = Array.isArray(users) ? users.find((u: any) => u.email === email) : null;

        if (!user) {
            return NextResponse.json({ error: 'User not found in Auth' }, { status: 404 });
        }

        console.log('✅ Found user UUID:', user.id);

        // Step 2: Update password using the user's UUID
        const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        console.log('📡 Update password response status:', updateRes.status);

        if (!updateRes.ok) {
            const errBody = await updateRes.text();
            console.error('📡 Update password failed:', updateRes.status, errBody);

            if (process.env.NODE_ENV === 'development') {
                otps.delete(email);
                return NextResponse.json({
                    message: 'Password reset (SIMULATION: update failed ' + updateRes.status + ')',
                    simulated: true
                });
            }
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        // Success!
        otps.delete(email);
        console.log('✅ Password updated successfully for', email);

        return NextResponse.json({ message: 'Password reset successfully' });

    } catch (error: any) {
        console.error('Reset password error:', error);

        if (process.env.NODE_ENV === 'development') {
            otps.delete((await request.clone().json().catch(() => ({}))).email);
            return NextResponse.json({
                message: 'Password reset (SIMULATION: exception caught)',
                simulated: true,
                debug: error.message
            });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
