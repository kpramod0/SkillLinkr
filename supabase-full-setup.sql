-- ============================================================
-- MASTER MIGRATION SCRIPT FOR SKILLLINKR
-- Run this in your Supabase SQL Editor to set up the entire database.
-- ============================================================

-- ============================================================
-- 1. BASE SCHEMA (Tables & Indexes)
-- ============================================================

-- DROP ALL TABLES (Clean Slate)
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

-- 1. PROFILES
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,                          -- email (matches auth.jwt -> email)
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    gender TEXT,
    age INTEGER,
    year TEXT,
    domains TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    open_to TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    photos TEXT[] DEFAULT '{}',
    github TEXT,
    linkedin TEXT,
    bio TEXT,
    interested_in TEXT[] DEFAULT '{}',
    interested_domains TEXT[] DEFAULT '{}',
    portfolio JSONB DEFAULT '[]',
    password_hash TEXT,
    role TEXT DEFAULT 'student',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ,
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SWIPES
CREATE TABLE swipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    swiper_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swiper_id, target_id)
);

-- 3. MATCHES
CREATE TABLE matches (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STARS
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

-- 8. MESSAGES
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    content TEXT,
    
    -- Media support
    attachment_url TEXT,
    attachment_type TEXT,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
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
    type TEXT CHECK (type IN ('like', 'message', 'team_invite', 'achievement', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
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

-- INDEXES
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_target ON swipes(target_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_team ON messages(team_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- 2. AUTH TRIGGERS (Auto-Create Profile)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, email, onboarding_completed)
  values (
    new.email, -- IMPORTANT: Use Email as ID
    'New', 
    'User', 
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.email,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
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

-- Basic "Allow All" Policies (for public read access generally)
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on swipes" ON swipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stars" ON stars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on team_applications" ON team_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on blocked_users" ON blocked_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reports" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_endorsements" ON project_endorsements FOR ALL USING (true) WITH CHECK (true);

-- SPECIFIC SECURE POLICIES FOR TEAMS & MESSAGES
-- (Overwrites previous generic ones for these critical tables)

DROP POLICY IF EXISTS "Allow all on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;

-- Team Members: View if member OR in same team
CREATE POLICY "View Team Memberships" ON team_members
FOR SELECT USING (
  user_id = (auth.jwt() ->> 'email')
  OR
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = (auth.jwt() ->> 'email')
  )
);
-- Allow joining (insert)
CREATE POLICY "Insert Team Memberships" ON team_members FOR INSERT WITH CHECK (true); -- Managed by API usually, but safe for now

-- Messages: View if sender, receiver, or in team
CREATE POLICY "View Messages" ON messages
FOR SELECT USING (
  sender_id = (auth.jwt() ->> 'email')
  OR
  receiver_id = (auth.jwt() ->> 'email')
  OR
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = (auth.jwt() ->> 'email')
  )
);

-- Messages: Insert if sender AND (DM or Member of Team)
CREATE POLICY "Insert Messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = (auth.jwt() ->> 'email')
  AND (
    (team_id IS NULL)
    OR
    (team_id IN (
      SELECT team_id FROM team_members WHERE user_id = (auth.jwt() ->> 'email')
    ))
  )
);

-- Grant Permissions
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON messages TO authenticated;
