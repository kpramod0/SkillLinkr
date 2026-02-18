import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials');
    return createClient(supabaseUrl, supabaseKey);
}

const BUCKET = 'uploads';

// Ensure storage bucket exists (creates once, idempotent)
async function ensureBucket() {
    const { data: buckets } = await getSupabase().storage.listBuckets();
    if (!buckets?.find(b => b.name === BUCKET)) {
        await getSupabase().storage.createBucket(BUCKET, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024, // 5MB
        });
    }
}

// POST: Upload a file to Supabase Storage
export async function POST(request: Request) {
    try {
        await ensureBucket();

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Generate a unique file path
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const folder = userId ? `users/${userId.replace(/[@.]/g, '_')}` : 'general';
        const filePath = `${folder}/${timestamp}_${random}.${ext}`;

        // Convert file to buffer for upload
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Supabase Storage
        const { data, error } = await getSupabase().storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
        }

        // Get the public URL
        const { data: urlData } = getSupabase().storage.from(BUCKET).getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        // If userId provided, add to profile photos array
        let photos: string[] = [];
        if (userId) {
            const { data: profile } = await getSupabase()
                .from('profiles')
                .select('photos')
                .eq('id', userId)
                .single();

            photos = profile?.photos || [];
            photos.push(publicUrl);

            await getSupabase()
                .from('profiles')
                .update({ photos })
                .eq('id', userId);
        }

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: filePath,
            photos: photos,
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}

// DELETE: Remove a file from Supabase Storage
export async function DELETE(request: Request) {
    try {
        const { userId, photoUrl } = await request.json();

        if (!photoUrl) {
            return NextResponse.json({ error: 'photoUrl required' }, { status: 400 });
        }

        // Extract file path from the public URL
        const urlParts = photoUrl.split(`/storage/v1/object/public/${BUCKET}/`);
        const filePath = urlParts[1];

        if (filePath) {
            await getSupabase().storage.from(BUCKET).remove([filePath]);
        }

        // Remove from profile photos array if userId provided
        if (userId) {
            const { data: profile } = await getSupabase()
                .from('profiles')
                .select('photos')
                .eq('id', userId)
                .single();

            if (profile?.photos) {
                const updatedPhotos = profile.photos.filter((p: string) => p !== photoUrl);
                await getSupabase()
                    .from('profiles')
                    .update({ photos: updatedPhotos })
                    .eq('id', userId);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
    }
}
