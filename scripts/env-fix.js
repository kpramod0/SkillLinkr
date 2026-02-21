const fs = require('fs');
const path = require('path');

/**
 * AWS Amplify Fix: By default, Amplify only exposes NEXT_PUBLIC_ variables to the SSR runtime.
 * This script runs during the BUILD phase to capture secret keys and write them to .env.production
 * so they are available to the Next.js server/API routes at runtime.
 */

const envPath = path.join(process.cwd(), '.env.production');

// Variables to bridge
const variables = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
];

let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

let addedCount = 0;
variables.forEach(key => {
    const value = process.env[key];
    if (value && !envContent.includes(`${key}=`)) {
        console.log(`[env-fix] Bridging ${key} to .env.production`);
        envContent += `${key}=${value}\n`;
        addedCount++;
    } else if (!value) {
        console.warn(`[env-fix] WARNING: ${key} is not set in build environment.`);
    }
});

if (addedCount > 0) {
    fs.writeFileSync(envPath, envContent);
    console.log(`[env-fix] Success: Added ${addedCount} variables to .env.production`);
} else {
    console.log('[env-fix] No new variables to bridge.');
}
