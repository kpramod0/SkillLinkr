import { useState, useCallback } from 'react';

interface CompressionOptions {
    maxSizeMB?: number; // Max size in MB (default 1MB)
    maxWidthOrHeight?: number; // Max width/height (default 1920px)
    initialQuality?: number; // Starting quality (0-1, default 0.8)
}

interface CompressedResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    width: number;
    height: number;
}

export function useImageCompression() {
    const [isCompressing, setIsCompressing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const compressImage = useCallback(async (file: File, options: CompressionOptions = {}): Promise<CompressedResult> => {
        setIsCompressing(true);
        setError(null);

        const MAX_SIZE_BYTES = (options.maxSizeMB || 1) * 1024 * 1024;
        const MAX_DIMENSION = options.maxWidthOrHeight || 1920;
        let quality = options.initialQuality || 0.8;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;

                img.onload = () => {
                    // 1. Calculate new dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height = Math.round((height * MAX_DIMENSION) / width);
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width = Math.round((width * MAX_DIMENSION) / height);
                            height = MAX_DIMENSION;
                        }
                    }

                    // 2. Draw to Canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        setIsCompressing(false);
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // 3. Compress loop (Recursively reduce quality if too big)
                    const attemptCompression = (q: number) => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Compression failed'));
                                    setIsCompressing(false);
                                    return;
                                }

                                if (blob.size > MAX_SIZE_BYTES && q > 0.1) {
                                    // Still too big, try lower quality
                                    attemptCompression(q - 0.1);
                                } else {
                                    // Success or reached min quality
                                    const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg', // Force JPEG for better compression
                                        lastModified: Date.now(),
                                    });

                                    setIsCompressing(false);
                                    resolve({
                                        file: compressedFile,
                                        originalSize: file.size,
                                        compressedSize: blob.size,
                                        width,
                                        height
                                    });
                                }
                            },
                            'image/jpeg',
                            q
                        );
                    };

                    attemptCompression(quality);
                };

                img.onerror = (err) => {
                    setError('Failed to load image');
                    setIsCompressing(false);
                    reject(err);
                };
            };

            reader.onerror = (err) => {
                setError('Failed to read file');
                setIsCompressing(false);
                reject(err);
            };
        });
    }, []);

    return { compressImage, isCompressing, error };
}
