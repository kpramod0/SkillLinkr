import { supabase } from './supabase';
import { UserProfile } from '@/types';

import fs from 'fs';
import path from 'path';

// File-based OTP store to survive HMR/Restarts in dev
const OTP_FILE = path.join(process.cwd(), 'otp-store.json');

function getStore(): Record<string, { otp: string, expires: number }> {
    try {
        if (!fs.existsSync(OTP_FILE)) return {};
        return JSON.parse(fs.readFileSync(OTP_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function saveStore(store: Record<string, any>) {
    try {
        fs.writeFileSync(OTP_FILE, JSON.stringify(store, null, 2));
    } catch (e) {
        console.error("Failed to save OTP store", e);
    }
}

export const otps = {
    set: (email: string, otp: string) => {
        const store = getStore();
        store[email] = { otp, expires: Date.now() + 10 * 60 * 1000 }; // 10 mins
        saveStore(store);
    },
    get: (email: string) => {
        const store = getStore();
        const entry = store[email];
        if (!entry) return undefined;
        if (Date.now() > entry.expires) {
            delete store[email];
            saveStore(store);
            return undefined;
        }
        return entry.otp;
    },
    delete: (email: string) => {
        const store = getStore();
        delete store[email];
        saveStore(store);
    },
};

export const verified = {
    add: (email: string) => { /* verified users logic if needed */ },
    has: (email: string) => false,
};

// Convert flat DB row → nested UserProfile
export function rowToProfile(row: any): UserProfile {
    return {
        id: row.id,
        personal: {
            firstName: row.first_name,
            middleName: row.middle_name || undefined,
            lastName: row.last_name,
            gender: row.gender,
            age: row.age,
        },
        professionalDetails: {
            year: row.year,
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

// Convert nested UserProfile → flat DB row for insert/update
export function profileToRow(profile: UserProfile) {
    return {
        id: profile.id,
        first_name: profile.personal.firstName,
        middle_name: profile.personal.middleName || null,
        last_name: profile.personal.lastName,
        gender: profile.personal.gender,
        age: profile.personal.age,

        // Professional Details
        year: profile.professionalDetails.year,
        domains: profile.professionalDetails.domains,
        skills: profile.professionalDetails.skills || [],
        open_to: profile.professionalDetails.openTo || [],
        languages: profile.professionalDetails.languages,

        // Visuals
        photos: profile.visuals.photos,
        github: profile.visuals.github || null,
        linkedin: profile.visuals.linkedin || null,
        bio: profile.visuals.bio || null,

        // Preferences (kept from original, not in diff but not explicitly removed)
        interested_in: profile.preferences.interestedIn,
        interested_domains: profile.preferences.interestedDomains || [],

        // Portfolio
        portfolio: (profile.portfolio || []).map(p => ({
            projectTitle: p.projectTitle || '',
            projectDescription: p.projectDescription || null,
            projectLink: p.projectLink || null,
            projectScreenshot: p.projectScreenshot || null,
            githubRepoLink: p.githubRepoLink || null,
            topContributions: p.topContributions || [],
        })),

        onboarding_completed: profile.onboardingCompleted, // Kept from original
        last_active: profile.lastActive || null, // Kept from original
    };
}

