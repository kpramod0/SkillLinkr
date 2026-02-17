import { createClient } from '@supabase/supabase-js';
import { Achievement } from '@/types';

// Initialize Supabase client (Server-side compatible)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const ACHIEVEMENTS: Omit<Achievement, 'dateEarned'>[] = [
    {
        id: 'first_step',
        title: 'First Step',
        description: 'Completed your profile onboarding.',
        icon: 'footprints',
        color: 'bg-emerald-500'
    },
    {
        id: 'rising_star',
        title: 'Rising Star',
        description: 'Earned 50 Reputation Points.',
        icon: 'star',
        color: 'bg-yellow-500'
    },
    {
        id: 'networker',
        title: 'Networker',
        description: 'Connected with 5 or more people.',
        icon: 'users',
        color: 'bg-blue-500'
    },
    {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Connected with 20 or more people.',
        icon: 'users',
        color: 'bg-purple-500'
    },
    {
        id: 'open_source_pro',
        title: 'Open Source Pro',
        description: 'Linked GitHub and earned 100+ Reputation.',
        icon: 'github',
        color: 'bg-zinc-800'
    },
    {
        id: 'team_player',
        title: 'Team Player',
        description: 'Joined a team.',
        icon: 'flag',
        color: 'bg-indigo-500'
    },
    {
        id: 'highly_reputable',
        title: 'Legendary',
        description: 'Earned 500 Reputation Points.',
        icon: 'trophy',
        color: 'bg-orange-500'
    }
];

export async function checkAndAwardAchievements(userId: string) {
    if (!userId) return [];

    try {
        // 1. Fetch comprehensive user data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*, teams!team_members(id)') // Join team_members to check team membership
            .eq('id', userId)
            .single();

        if (error || !profile) return [];

        const currentAchievements: Achievement[] = profile.achievements || [];
        const earnedIds = new Set(currentAchievements.map(a => a.id));
        const newAchievements: Achievement[] = [];

        // 2. Fetch connection count (matches)
        const { count: matchCount } = await supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        const connections = matchCount || 0;
        const reputation = profile.reputation || 0;

        // 3. Check Criteria

        // First Step: Onboarding Completed
        if (profile.onboarding_completed && !earnedIds.has('first_step')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'first_step')!, dateEarned: Date.now() });
        }

        // Rising Star: Rep > 50
        if (reputation >= 50 && !earnedIds.has('rising_star')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'rising_star')!, dateEarned: Date.now() });
        }

        // Legendary: Rep > 500
        if (reputation >= 500 && !earnedIds.has('highly_reputable')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'highly_reputable')!, dateEarned: Date.now() });
        }

        // Networker: 5+ Connections
        if (connections >= 5 && !earnedIds.has('networker')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'networker')!, dateEarned: Date.now() });
        }

        // Social Butterfly: 20+ Connections
        if (connections >= 20 && !earnedIds.has('social_butterfly')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'social_butterfly')!, dateEarned: Date.now() });
        }

        // Open Source Pro: GitHub Linked + Rep > 100
        if (profile.github && reputation >= 100 && !earnedIds.has('open_source_pro')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'open_source_pro')!, dateEarned: Date.now() });
        }

        // Team Player: Is in at least one team
        if (profile.teams && profile.teams.length > 0 && !earnedIds.has('team_player')) {
            newAchievements.push({ ...ACHIEVEMENTS.find(a => a.id === 'team_player')!, dateEarned: Date.now() });
        }

        // 4. Update Database if new achievements unlocked
        if (newAchievements.length > 0) {
            const updatedList = [...currentAchievements, ...newAchievements];

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ achievements: updatedList })
                .eq('id', userId);

            if (updateError) {
                console.error('Failed to update achievements', updateError);
            } else {
                console.log(`[ACHIEVEMENT] Awarded ${newAchievements.length} badges to ${userId}`);
            }
        }

        return newAchievements;

    } catch (err) {
        console.error('Error checking achievements:', err);
        return [];
    }
}
