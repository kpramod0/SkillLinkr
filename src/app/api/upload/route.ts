import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';



const BUCKET = 'uploads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // CRITICAL: MUST use Service Role Key for storage operations to bypass RLS.
    // If this is missing, the upload will fail with RLS violation.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
    if (!serviceRoleKey) {
        console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!");
        console.log("Environment check:", {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            nodeEnv: process.env.NODE_ENV
        });
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. If you just added it to Amplify/Vercel, you MUST trigger a new deployment for it to take effect.");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    });
}

async function ensureBucket() {
    try {
        const sb = getSupabase();
        const { data: buckets, error } = await sb.storage.listBuckets();

        if (error) {
            // If listing fails (e.g. RLS), we just proceed hoping bucket exists
            return;
        }

        if (!buckets?.find(b => b.name === BUCKET)) {
            await sb.storage.createBucket(BUCKET, {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
            }).catch(() => { });
        }
    } catch { }
}

function safeFolderName(userId: string) {
    return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function POST(request: Request) {
    try {
        await ensureBucket();

        const formData = await request.formData();
        const file = formData.get('file') as File;
        // In this app, userId IS the email. Keeping it as string.
        const userId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Detect extension
        let ext = "jpg";
        if (file.type === "image/webp") ext = "webp";
        else if (file.type === "image/png") ext = "png";
        else if (file.type === "image/jpeg") ext = "jpg";

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const folder = `users/${safeFolderName(userId)}`;
        const filePath = `${folder}/${timestamp}_${random}.${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        const sb = getSupabase();

        const { error: uploadError } = await sb.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('[upload] Storage error:', uploadError);
            return NextResponse.json({ error: 'Storage upload failed: ' + uploadError.message }, { status: 500 });
        }

        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filePath);

        // Cache busting URL (versioned)
        const publicUrl = `${urlData.publicUrl}?v=${timestamp}`;

        // Fetch existing photos to preserve gallery
        const { data: profileRow } = await sb
            .from('profiles')
            .select('photos')
            .eq('id', userId)
            .maybeSingle();

        const existingPhotos: string[] = profileRow?.photos || [];
        // Replace avatar (index 0)
        const gallery = existingPhotos.slice(1, 4);
        const updatedPhotos = [publicUrl, ...gallery];

        const { data: updatedRows, error: updateError } = await sb
            .from('profiles')
            .update({ photos: updatedPhotos })
            .eq('id', userId)
            .select();

        if (updateError) {
            console.error('[upload] DB update failed:', updateError);
            return NextResponse.json({ error: 'Database update failed: ' + updateError.message }, { status: 500 });
        } else if (!updatedRows || updatedRows.length === 0) {
            // Fallback: Create row if missing
            console.warn('[upload] Profile row missing for', userId, '— creating fallback row.');
            const { error: insertError } = await sb.from('profiles').insert({
                id: userId,
                photos: updatedPhotos,
                role: 'student',
                onboarding_completed: false
            });

            if (insertError) {
                return NextResponse.json({ error: 'Profile creation failed: ' + insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: filePath,
        });

    } catch (error: any) {
        console.error('[upload] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}

// DELETE: Remove file from storage and profile photos array
// DELETE: Remove file from storage and profile photos array
export async function DELETE(request: Request) {
    try {
        // Accept both `url` (ProfileEditor) and `photoUrl` (legacy) for backwards compatibility
        const { userId, url, photoUrl: legacyPhotoUrl } = await request.json();
        const photoUrl = url || legacyPhotoUrl;

        if (!photoUrl) {
            return NextResponse.json({ error: 'url required' }, { status: 400 });
        }

        const sb = getSupabase();

        // Remove from Supabase Storage
        const urlParts = photoUrl.split(`/storage/v1/object/public/${BUCKET}/`);
        // Remove query params (e.g. ?v=123) to get the actual file path
        const filePath = urlParts[1]?.split('?')[0];

        if (filePath) {
            await sb.storage.from(BUCKET).remove([filePath]).catch(() => { });
        }

        // Remove from profile photos array — profiles.id = email
        if (userId) {
            const { data: profileRow } = await sb
                .from('profiles')
                .select('photos')
                .eq('id', userId)
                .single();

            if (profileRow?.photos) {
                // Filter out the photo, ignoring query params for matching
                const targetBase = photoUrl.split('?')[0];
                const updatedPhotos = profileRow.photos.filter((p: string) => p.split('?')[0] !== targetBase);

                await sb
                    .from('profiles')
                    .update({ photos: updatedPhotos })
                    .eq('id', userId);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[upload delete] Error:', error);
        return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
    }
}
