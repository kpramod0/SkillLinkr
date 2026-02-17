import { UserProfile, Match, Message } from '@/types';

type Store = {
    otps: Record<string, string>; // email -> otp
    verifiedUsers: Set<string>; // Set of emails
    profiles: Record<string, UserProfile>; // email -> profile
    swipes: Record<string, Record<string, 'like' | 'pass'>>; // liker_email -> { target_email -> action }
    stars: Record<string, Set<string>>; // user_email -> Set<starred_user_emails>
    matches: Match[]; // Array of match objects
    messages: Message[];
};

declare global {
    // eslint-disable-next-line no-var
    var _store: Store | undefined;
}

export const store = globalThis._store || {
    otps: {},
    verifiedUsers: new Set(),
    profiles: {},
    swipes: {},
    stars: {},
    matches: [],
    messages: []
};

if (process.env.NODE_ENV !== 'production') {
    globalThis._store = store;
}

// No seed data - users will create their own accounts for testing
