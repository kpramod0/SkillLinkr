import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export type NotificationType = 'like' | 'message' | 'team_invite' | 'achievement' | 'system';

/**
 * Creates a new notification for a user.
 * @param userId - The recipient's ID
 * @param type - Type of notification
 * @param title - Short title
 * @param message - Body text
 * @param link - Optional URL to navigate to
 */
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                link
            });

        if (error) {
            console.error('[Notification] Insert failed:', error);
        } else {
            // console.log(`[Notification] Sent to ${userId}: ${title}`);
        }
    } catch (err) {
        console.error('[Notification] Error:', err);
    }
}
