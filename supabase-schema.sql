-- ============================================================
-- FULL DATABASE SCHEMA FOR SKILLLINKR
-- Run this in your Supabase project's SQL Editor
-- Safe to re-run: drops everything first
-- ============================================================

-- STEP 1: DROP ALL TABLES (cascade removes policies, indexes, etc.)
DROP TABLE IF EXISTS project_endorsements CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS team_applications CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS stars CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS swipes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- STEP 2: CREATE ALL TABLES
-- ============================================================

-- 1. PROFILES (primary user table, id = email)
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,                          -- email (e.g., user@kiit.ac.in)
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    gender TEXT,
    age INTEGER,

    -- Professional Details
    year TEXT,                                     -- e.g., '2nd', '3rd'
    domains TEXT[] DEFAULT '{}',                   -- e.g., {'Frontend', 'Backend'}
    skills TEXT[] DEFAULT '{}',                    -- e.g., {'React', 'Node.js'}
    open_to TEXT[] DEFAULT '{}',                   -- e.g., {'Hackathons', 'Projects'}
    languages TEXT[] DEFAULT '{}',                 -- e.g., {'JavaScript', 'Python'}

    -- Visuals
    photos TEXT[] DEFAULT '{}',                    -- array of photo URLs
    github TEXT,
    linkedin TEXT,
    bio TEXT,

    -- Preferences
    interested_in TEXT[] DEFAULT '{}',
    interested_domains TEXT[] DEFAULT '{}',

    -- Portfolio (stored as JSONB array)
    portfolio JSONB DEFAULT '[]',

    -- Auth
    password_hash TEXT,                            -- PBKDF2 hashed password (salt:hash)
    role TEXT DEFAULT 'student',                   -- 'student' or 'faculty'

    -- Meta
    onboarding_completed BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ,
    reputation INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SWIPES (likes, passes)
CREATE TABLE swipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    swiper_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swiper_id, target_id)
);

-- 3. MATCHES (mutual likes)
CREATE TABLE matches (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STARS (super likes / bookmarks)
CREATE TABLE stars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    starred_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, starred_id)
);

-- 5. TEAMS
CREATE TABLE teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_name TEXT,
    roles_needed TEXT[] DEFAULT '{}',
    skills_required TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TEAM MEMBERS
CREATE TABLE team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 7. TEAM APPLICATIONS
CREATE TABLE team_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    applicant_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, applicant_id)
);

-- 8. MESSAGES (DMs and team group chats)
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT,
    file_name TEXT,
    file_size INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BLOCKED USERS
CREATE TABLE blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- 11. REPORTS
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PROJECT ENDORSEMENTS
CREATE TABLE project_endorsements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endorser_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    project_title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endorser_id, profile_id, project_title)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_target ON swipes(target_id);
CREATE INDEX idx_swipes_action ON swipes(action);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_team ON messages(team_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_applications_team ON team_applications(team_id);
CREATE INDEX idx_team_applications_applicant ON team_applications(applicant_id);
CREATE INDEX idx_team_applications_status ON team_applications(status);
CREATE INDEX idx_teams_creator ON teams(creator_id);
CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_stars_user ON stars(user_id);
CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);

-- ============================================================
-- ROW LEVEL SECURITY + OPEN POLICIES (MVP)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on swipes" ON swipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stars" ON stars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on team_applications" ON team_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on blocked_users" ON blocked_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reports" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_endorsements" ON project_endorsements FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME (for live chat)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
