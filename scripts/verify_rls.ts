import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zqaxqygvsyegaxenfxwm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxYXhxeWd2c3llZ2F4ZW5meHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTYwODEsImV4cCI6MjA4NjczMjA4MX0.w4QzHLThi5djBJC6efGXPADBm5txz24j0ueeW4Xi_mA";

// MOCK USERS for simulation (we don't need real login, just JWT tokens)
// Since we can't easily generate valid JWTs signed by Supabase without the service role or a login,
// we will start by using a public client to try and read "open" and "closed" data.
//
// NOTE: To truly test RLS, we need an authenticated client. 
// A robust test would require signing in. 
// For this script, we will simulate the "Public/Anon" role vs "Service Role".

async function runVerification() {
    console.log("🔒 Starting RLS Policy Verification...");

    const publicClient = createClient(supabaseUrl, supabaseAnonKey);

    // Test 1: Public should NOT see messages
    console.log("\n1. Testing Public Access to Messages on 'messages' table...");
    const { data: publicMsgs, error: publicErr } = await publicClient.from('messages').select('*').limit(5);

    if (publicErr) {
        console.log("   ✅ Public access blocked/error:", publicErr.message);
    } else if (publicMsgs && publicMsgs.length === 0) {
        // It returns empty array if RLS works but no rows match "public" policy (which shouldn't exist)
        console.log("   ✅ Public access returned 0 rows (RLS likely hiding data).");
    } else {
        console.error("   ❌ SECURITY FAIL: Public client saw messages:", publicMsgs);
    }

    // Test 2: Public should NOT see team_members
    console.log("\n2. Testing Public Access to 'team_members'...");
    const { data: publicMembers, error: memErr } = await publicClient.from('team_members').select('*').limit(5);

    if (memErr) {
        console.log("   ✅ Public access blocked:", memErr.message);
    } else if (publicMembers && publicMembers.length === 0) {
        console.log("   ✅ Public access returned 0 rows.");
    } else {
        console.error("   ❌ SECURITY FAIL: Public client saw members:", publicMembers);
    }

    // Test 3: Public SHOULD see OPEN teams (Discovery)
    console.log("\n3. Testing Public Access to 'teams' (Discovery)...");
    const { data: publicTeams } = await publicClient.from('teams').select('*').eq('status', 'open').limit(5);

    if (publicTeams && publicTeams.length > 0) {
        console.log(`   ✅ Public saw ${publicTeams.length} open teams (Expected behavior for discovery).`);
    } else {
        console.log("   ⚠️ Public saw 0 open teams (Might just be empty DB, or RLS issue if teams exist).");
    }

    console.log("\n✅ Verification Complete.");
}

runVerification();
