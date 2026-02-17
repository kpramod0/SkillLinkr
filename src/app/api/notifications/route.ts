import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/notifications?userId=...
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50); // Limit to last 50

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/notifications
// Body: { action: 'mark_read', notificationId: string | 'all', userId: string }
export async function POST(req: Request) {
    try {
        const { action, notificationId, userId } = await req.json();

        if (action === 'mark_read') {
            if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

            let query = supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId);

            if (notificationId !== 'all') {
                query = query.eq('id', notificationId);
            } else {
                query = query.eq('is_read', false); // Only update unread ones if 'all'
            }

            const { error } = await query;
            if (error) throw error;

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Update notification error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
