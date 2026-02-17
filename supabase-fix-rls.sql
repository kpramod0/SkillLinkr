-- ============================================================
-- FIX: RLS POLICIES FOR EMAIL-BASED IDs
-- ============================================================

-- Problem: Tables use Email as ID, but auth.uid() is UUID.
-- Fix: Use auth.jwt() ->> 'email' to compare with user_id.

-- 1. Enable RLS (Ensure it is on)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (Safe to run)
DROP POLICY IF EXISTS "Allow all on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "Team members view own rows" ON team_members;
DROP POLICY IF EXISTS "Team members view team messages" ON messages;
DROP POLICY IF EXISTS "View Team Memberships" ON team_members;
DROP POLICY IF EXISTS "View Messages" ON messages;
DROP POLICY IF EXISTS "Insert Messages" ON messages;

-- 3. Create Correct Policies for TEAM MEMBERS
-- User can see membership if they are the user OR they are in the team
CREATE POLICY "View Team Memberships" ON team_members
FOR SELECT USING (
  user_id = (auth.jwt() ->> 'email') -- I am the member
  OR
  team_id IN ( -- I am in the team (as another member)
    SELECT team_id FROM team_members WHERE user_id = (auth.jwt() ->> 'email')
  )
);

-- 4. Create Correct Policies for MESSAGES
-- User can see messages if they are sender, receiver, or in the team
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

-- 5. Create Correct Policies for INSERTING Messages
CREATE POLICY "Insert Messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = (auth.jwt() ->> 'email')
  AND (
    -- DM
    (team_id IS NULL)
    OR
    -- Team Chat (Must be a member)
    (team_id IN (
      SELECT team_id FROM team_members WHERE user_id = (auth.jwt() ->> 'email')
    ))
  )
);

-- 6. Grant Permissions (Just in case)
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON messages TO authenticated;
