-- ============================================================
-- REPAIR: Ensure all team creators are in team_members as admin
-- Run this ONCE in Supabase SQL Editor to fix existing teams
-- ============================================================

-- 1. Insert missing creator rows for ALL existing teams
-- Uses ON CONFLICT to avoid duplicates (idempotent - safe to run multiple times)
INSERT INTO team_members (team_id, user_id, role)
SELECT id, creator_id, 'admin'
FROM teams
ON CONFLICT (team_id, user_id) DO UPDATE
  SET role = 'admin'
WHERE team_members.role NOT IN ('admin', 'Leader', 'creator');

-- 2. Verify: Show all teams with their creator membership
SELECT 
    t.id,
    t.title,
    t.creator_id,
    tm.role AS creator_role,
    CASE WHEN tm.user_id IS NOT NULL THEN 'YES' ELSE 'MISSING' END AS creator_in_members
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = t.creator_id
ORDER BY t.created_at DESC;

-- ============================================================
-- OPTIONAL: Ensure the trigger is in place for NEW teams
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin')
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = 'admin';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_team();
