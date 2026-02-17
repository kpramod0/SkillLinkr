# Database Setup Instructions

The application requires a `notifications` table in your Supabase database which is currently missing. Please follow these steps to create it:

1.  **Log in to your Supabase Dashboard**.
2.  Select your project.
3.  Go to the **SQL Editor** (icon on the left sidebar).
4.  Click **New Query**.
5.  Copy and paste the following SQL code into the editor:

```sql
-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id),
    type TEXT NOT NULL CHECK (type IN ('like', 'message', 'team_invite', 'achievement', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast fetching
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- RLS (Open for now)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);
```

6.  Click **Run** to execute the query.
7.  Verify that the table `notifications` now exists in the **Table Editor**.
