-- Add role column to team_members
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));

-- Update existing creators to be admins
-- (Assuming we can identify them, or we just rely on future logic. 
-- Ideally, we'd set the creator as admin. 
-- In 'teams' table we have 'created_by'. We can update team_members based on that.)

UPDATE team_members
SET role = 'admin'
FROM teams
WHERE team_members.team_id = teams.id AND team_members.user_id = teams.created_by;
