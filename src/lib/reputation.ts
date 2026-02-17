import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const REP_POINTS = {
    PROJECT_ADDED: 3,
    GITHUB_LINKED: 4,
    LINKEDIN_LINKED: 4,
    PROFILE_COMPLETE: 2, // Skills + Education
    STARRED: 10,
    MATCHED: 15,
    MESSAGE_RECEIVED: 1, // Max 5 per day
    REPORT_GHOSTING: -50,
    REPORT_MISBEHAVIOR: -10,
    PROJECT_ENDORSEMENT: 20
};

/**
 * Updates a user's reputation score.
 * @param userId - The ID (email) of the user to update.
 * @param points - The accumulated points to add (can be negative).
 * @param reason - A short string describing why (for future logs).
 */
export async function updateReputation(userId: string, points: number, reason: string) {
    if (!userId || points === 0) return;

    try {
        // We use an RPC call or direct update. 
        // Since we don't have a custom RPC for increment, we fetch -> add -> update.
        // In a high-concurrency app, this should be an SQL function (reputation = reputation + x).
        // For MVP, this is acceptable.

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('reputation')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const currentRep = profile?.reputation || 0;
        const newRep = Math.max(0, currentRep + points); // Prevent negative reputation? Or allow it? Let's allow > 0 for now.

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ reputation: newRep })
            .eq('id', userId);

        if (updateError) throw updateError;

        console.log(`[REP] Updated ${userId}: ${points > 0 ? '+' : ''}${points} (${reason}) => Now: ${newRep}`);

        // Check for new achievements
        try {
            // Dynamically import to avoid circular deps if any
            const { checkAndAwardAchievements } = await import('@/lib/achievements');
            const { createNotification } = await import('@/lib/notifications');

            const newBadges = await checkAndAwardAchievements(userId);

            // Notify for each new badge
            for (const badge of newBadges) {
                await createNotification(
                    userId,
                    'achievement',
                    'Achievement Unlocked! 🏆',
                    `You earned the "${badge.title}" badge.`,
                    `/main/profile`
                );
            }

        } catch (achievementError) {
            console.error('[REP] Failed to check achievements:', achievementError);
        }

    } catch (error) {
        console.error(`[REP] Failed to update reputation for ${userId}:`, error);
    }
}
