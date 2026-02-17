-- Add support for rich media in messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Index for faster filtering if needed (optional but good practice)
-- CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
