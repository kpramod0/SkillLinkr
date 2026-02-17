"use client";

import { useState } from 'react';
import { ImageUploader } from '@/components/media/ImageUploader';

export default function TestCompressionPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploaded, setUploaded] = useState(false);

    const handleUpload = (compressedFile: File) => {
        console.log('Uploading file:', compressedFile.name, compressedFile.size);
        setUploaded(true);
        setTimeout(() => setUploaded(false), 2000); // Reset after 2 seconds
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-violet-600 bg-clip-text text-transparent">
                Image Compression Test
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Test 1: Production Mode (Clean, No Stats) */}
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <h2 className="text-xl font-semibold mb-2">Production Mode</h2>
                    <p className="text-zinc-400 text-sm mb-6">
                        Clean UI for end users. Hover the preview to see "Upload" button.
                    </p>

                    <ImageUploader
                        maxSizeMB={1}
                        showStats={false}
                        onImageSelected={(f) => setFile(f)}
                        onUpload={handleUpload}
                    />

                    {uploaded && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-green-400 text-sm">✓ Uploaded successfully!</p>
                        </div>
                    )}
                </div>

                {/* Test 2: Debug Mode (With Stats) */}
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <h2 className="text-xl font-semibold mb-2">Debug Mode</h2>
                    <p className="text-zinc-400 text-sm mb-6">
                        With compression stats visible for testing.
                    </p>

                    <ImageUploader
                        maxSizeMB={1}
                        showStats={true}
                        onImageSelected={(f) => setFile(f)}
                    />
                </div>
            </div>
        </div>
    );
}
