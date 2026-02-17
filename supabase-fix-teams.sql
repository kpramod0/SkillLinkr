-- ============================================================
-- FIX: AUTO-ADD CREATOR TO TEAM MEMBERS
-- ============================================================

-- 1. Create Function
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin')
  ON CONFLICT (team_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_team();
