-- ============================================================
-- SECURE RLS POLICIES FOR SKILLLINKR TEAM SYSTEM
-- Enforces strict access control for Realtime and DB access
-- ============================================================

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to get current user's email
-- This handles the mapping between auth.uid() (UUID) and our profile.id (Email)
CREATE OR REPLACE FUNCTION auth_email() RETURNS text AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Public profiles" ON profiles;
DROP POLICY IF EXISTS "User update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;

-- Everyone can read profiles
CREATE POLICY "Public profiles" ON profiles
  FOR SELECT USING (true);

-- Only user can update their own profile
CREATE POLICY "User update own profile" ON profiles
  FOR UPDATE USING (id = auth_email());

-- ============================================================
-- TEAMS
-- ============================================================
DROP POLICY IF EXISTS "View open teams or my teams" ON teams;
DROP POLICY IF EXISTS "Creator manage teams" ON teams;
DROP POLICY IF EXISTS "Allow all on teams" ON teams;

-- Select: Open teams OR I am creator OR I am member
CREATE POLICY "View open teams or my teams" ON teams
  FOR SELECT USING (
    status = 'open' 
    OR creator_id = auth_email()
    OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth_email()
    )
  );

-- Insert/Update/Delete: Only creator
CREATE POLICY "Creator manage teams" ON teams
  FOR ALL USING (creator_id = auth_email());

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "View members of my teams" ON teams; 
DROP POLICY IF EXISTS "View members of my teams" ON team_members;
DROP POLICY IF EXISTS "Owner manage members" ON team_members;
DROP POLICY IF EXISTS "Allow all on team_members" ON team_members;

-- Select: I can see members if I am in the team
CREATE POLICY "View members of my teams" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth_email()
    )
  );

-- Insert/Delete: Only Team Owner (Creator) can manage members via RLS (API uses Service Role to bypass)
CREATE POLICY "Owner manage members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.creator_id = auth_email()
    )
  );

-- ============================================================
-- TEAM APPLICATIONS
-- ============================================================
DROP POLICY IF EXISTS "Applicant apply" ON team_applications;
DROP POLICY IF EXISTS "View my applications or my team apps" ON team_applications;
DROP POLICY IF EXISTS "Allow all on team_applications" ON team_applications;

-- Select: I am applicant OR I am team owner
CREATE POLICY "View my applications or my team apps" ON team_applications
  FOR SELECT USING (
    applicant_id = auth_email()
    OR EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_applications.team_id 
      AND teams.creator_id = auth_email()
    )
  );

-- Insert: I am applicant
CREATE POLICY "Applicant apply" ON team_applications
  FOR INSERT WITH CHECK (applicant_id = auth_email());

-- Update: Team Owner (Reject/Accept) - usually API does this, but allow owner here too
DROP POLICY IF EXISTS "Owner update applications" ON team_applications;
CREATE POLICY "Owner update applications" ON team_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_applications.team_id 
      AND teams.creator_id = auth_email()
    )
  );

-- ============================================================
-- MESSAGES (The Critical Part)
-- ============================================================
DROP POLICY IF EXISTS "View messages" ON messages;
DROP POLICY IF EXISTS "Send messages" ON messages;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;

-- Select: Sender OR Receiver OR (Team Member)
CREATE POLICY "View messages" ON messages
  FOR SELECT USING (
    sender_id = auth_email()
    OR receiver_id = auth_email()
    OR (
      team_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = messages.team_id 
        AND team_members.user_id = auth_email()
      )
    )
  );

-- Insert: I am sender AND (I am member IF team msg)
CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth_email()
    AND (
      -- DM case: no team_id
      (team_id IS NULL)
      OR
      -- Group case: must be member
      (
        team_id IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_members.team_id = messages.team_id 
          AND team_members.user_id = auth_email()
        )
      )
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS "Own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;

-- Select/Update/Delete: Only my own
CREATE POLICY "Own notifications" ON notifications
  FOR ALL USING (user_id = auth_email());

-- Insert: Usually Service Role (API), but specific use cases might need user-trigger
-- For now, assume API handles inserts via Service Role. If clients insert, add policy.
-- Keeping it locked to API for safety.

