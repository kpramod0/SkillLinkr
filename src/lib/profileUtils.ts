
import { UserProfile } from "@/types";

// Convert flat DB row → nested UserProfile
// This is a client-safe version (no fs/path imports)
export function mapRowToProfile(row: any): UserProfile {
    return {
        id: row.id,
        personal: {
            firstName: row.first_name,
            middleName: row.middle_name || undefined,
            lastName: row.last_name,
            gender: row.gender || 'Other',
            age: row.age || 0,
        },
        professionalDetails: {
            year: row.year || '1st',
            domains: row.domains || [],
            skills: Array.isArray(row.skills) ? row.skills : [],
            openTo: row.open_to || [],
            languages: row.languages || [],
        },
        visuals: {
            photos: row.photos || [],
            github: row.github || undefined,
            linkedin: row.linkedin || undefined,
            bio: row.bio || undefined,
        },
        portfolio: Array.isArray(row.portfolio) ? row.portfolio.map((p: any) => ({
            projectTitle: p.projectTitle || '',
            projectDescription: p.projectDescription || undefined,
            projectLink: p.projectLink || undefined,
            projectScreenshot: p.projectScreenshot || undefined,
            githubRepoLink: p.githubRepoLink || undefined,
            topContributions: p.topContributions || [],
        })) : [],
        preferences: {
            interestedIn: row.interested_in || [],
            interestedDomains: row.interested_domains || [],
        },
        onboardingCompleted: row.onboarding_completed,
        lastActive: row.last_active || undefined,
    };
}
