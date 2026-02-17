-- ============================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================================

-- 1. Create a SECURITY DEFINER function to check membership
-- This bypasses RLS, breaking the recursion loop when policies call it.
CREATE OR REPLACE FUNCTION is_team_member(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM team_members 
    WHERE team_id = _team_id 
    AND user_id = (auth.jwt() ->> 'email')
  );
END;
$$;

-- 2. Update TEAMS Policy (Optional, but cleaner)
DROP POLICY IF EXISTS "View open teams or my teams" ON teams;
CREATE POLICY "View open teams or my teams" ON teams
  FOR SELECT USING (
    status = 'open' 
    OR creator_id = (auth.jwt() ->> 'email')
    OR is_team_member(id)  -- Use function
  );

-- 3. Update TEAM MEMBERS Policy (The Fix)
DROP POLICY IF EXISTS "View members of my teams" ON team_members;
CREATE POLICY "View members of my teams" ON team_members
  FOR SELECT USING (
    is_team_member(team_id) -- Use function
  );

-- 4. Update MESSAGES Policy (The Fix)
DROP POLICY IF EXISTS "View messages" ON messages;
CREATE POLICY "View messages" ON messages
  FOR SELECT USING (
    sender_id = (auth.jwt() ->> 'email')
    OR receiver_id = (auth.jwt() ->> 'email')
    OR (
      team_id IS NOT NULL 
      AND is_team_member(team_id) -- Use function
    )
  );

-- 5. Update SEND MESSAGE Policy
DROP POLICY IF EXISTS "Send messages" ON messages;
CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = (auth.jwt() ->> 'email')
    AND (
      (team_id IS NULL)
      OR
      (
        team_id IS NOT NULL 
        AND is_team_member(team_id) -- Use function
      )
    )
  );
