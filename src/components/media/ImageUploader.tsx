import { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useImageCompression } from '@/hooks/useImageCompression';

interface ImageUploaderProps {
    onImageSelected: (file: File) => void;
    onUpload?: (file: File) => void; // Optional: If provided, shows an "Upload" button
    maxSizeMB?: number;
    className?: string;
    showStats?: boolean;
}

export function ImageUploader({ onImageSelected, onUpload, maxSizeMB = 1, className = '', showStats = false }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState<string | null>(null);
    const [compressedSize, setCompressedSize] = useState<string | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { compressImage, isCompressing } = useImageCompression();

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setOriginalSize(formatSize(file.size));
        setCompressedSize(null);

        try {
            // Compress
            const result = await compressImage(file, { maxSizeMB });

            setCompressedSize(formatSize(result.compressedSize));
            setCompressedFile(result.file);
            onImageSelected(result.file); // Pass compressed file up

            // Update preview with compressed version (optional, but good to verify visual quality)
            // URL.revokeObjectURL(objectUrl); // Clean up old one
            // setPreview(URL.createObjectURL(result.file));

        } catch (error) {
            console.error('Compression failed:', error);
            alert('Failed to compress image');
        }
    };

    const clearImage = () => {
        setPreview(null);
        setOriginalSize(null);
        setCompressedSize(null);
        setCompressedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {!preview ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors h-48"
                >
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Max size: {maxSizeMB}MB (Compressed)</p>
                </div>
            ) : (
                <div className="relative border rounded-xl overflow-hidden bg-muted/20">
                    <img
                        src={preview}
                        alt="Preview"
                        className={`w-full h-64 object-contain bg-black/5 ${isCompressing ? 'opacity-50 blur-sm' : ''}`}
                    />

                    {/* Clear Button */}
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* Upload Button (if provided) */}
                    {onUpload && compressedFile && !isCompressing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onUpload(compressedFile)}
                                className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Image
                            </button>
                        </div>
                    )}

                    {/* Stats Overlay (Optional) */}
                    {showStats && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-3 text-white flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-xs text-white/70">Original</span>
                                <span className="text-sm font-medium">{originalSize}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {isCompressing ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-green-300">Compressed</span>
                                        <span className="text-sm font-bold text-green-400">{compressedSize}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
