import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Use service role key to bypass RLS — falls back to anon key if not set
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseKey);
}

const BUCKET = 'uploads';

// Silently ensure bucket exists — won't crash if permissions insufficient
async function ensureBucket() {
    try {
        const sb = getSupabase();
        const { data: buckets } = await sb.storage.listBuckets();
        if (!buckets?.find(b => b.name === BUCKET)) {
            await sb.storage.createBucket(BUCKET, {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
            }).catch(() => { }); // may already exist
        }
    } catch {
        // Bucket listing blocked (insufficient permissions) — assume bucket exists
    }
}

// POST: Upload file, save URL to profiles.photos
export async function POST(request: Request) {
    try {
        await ensureBucket();

        const formData = await request.formData();
        const file = formData.get('file') as File;
        // userId is the user's EMAIL — in this app, profiles.id = email
        const userId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Build unique storage path
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const folder = userId ? `users/${userId.replace(/[@.]/g, '_')}` : 'general';
        const filePath = `${folder}/${timestamp}_${random}.${ext}`;

        // Upload to Supabase Storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const sb = getSupabase();

        const { error: uploadError } = await sb.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true, // overwrite if same path (shouldn't happen with timestamps)
            });

        if (uploadError) {
            console.error('[upload] Storage error:', uploadError);
            return NextResponse.json({ error: 'Storage upload failed: ' + uploadError.message }, { status: 500 });
        }

        // Get the public URL
        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        // Save URL to profiles.photos
        // IMPORTANT: in this app, profiles.id = user's email address
        if (userId) {
            // Fetch current photos array
            const { data: profileRow, error: fetchError } = await sb
                .from('profiles')
                .select('photos')
                .eq('id', userId)   // profiles.id = email
                .single();

            if (fetchError) {
                console.warn('[upload] Could not fetch profile photos, will attempt direct update:', fetchError.message);
            }

            const existingPhotos: string[] = profileRow?.photos || [];
            // Replace avatar (index 0) with the new photo, keep remaining as gallery (max 5 total)
            const gallery = existingPhotos.slice(1, 4); // keep non-avatar photos
            const updatedPhotos = [publicUrl, ...gallery];

            const { data: updatedRows, error: updateError } = await sb
                .from('profiles')
                .update({ photos: updatedPhotos })
                .eq('id', userId)   // profiles.id = email
                .select();

            if (updateError) {
                console.error('[upload] DB update error:', updateError);
                // Return error to client so they know persistence failed
                return NextResponse.json({ error: 'Database update failed: ' + updateError.message }, { status: 500 });
            } else if (!updatedRows || updatedRows.length === 0) {
                // Row missing! The auth trigger likely failed.
                // Fallback: Create the profile row now.
                console.warn('[upload] Profile row missing for', userId, '— creating fallback row.');

                const { error: insertError } = await sb
                    .from('profiles')
                    .insert({
                        id: userId,
                        photos: updatedPhotos,
                        // Set minimal defaults
                        role: 'student',
                        onboarding_completed: false
                    });

                if (insertError) {
                    console.error('[upload] Fallback insert failed:', insertError);
                    return NextResponse.json({ error: 'Profile creation failed: ' + insertError.message }, { status: 500 });
                }
            } else {
                console.log('[upload] Saved photos to profile:', userId);
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
        const filePath = urlParts[1];
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
                const updatedPhotos = profileRow.photos.filter((p: string) => p !== photoUrl);
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
