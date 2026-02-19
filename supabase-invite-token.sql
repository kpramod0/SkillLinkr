-- ============================================================
-- ADD invite_token column to teams table (for invite link feature)
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

-- Optional: pre-generate tokens for all existing teams
UPDATE teams SET invite_token = gen_random_uuid()::TEXT WHERE invite_token IS NULL;
