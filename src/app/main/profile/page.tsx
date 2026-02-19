"use client"

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/imageUtils";
import { LogOut, User as UserIcon, Camera, Edit2, X, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileEditor } from "@/components/forms/ProfileEditor";

export default function ProfilePage() {
    const router = useRouter();
    const [email, setEmail] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showPhotoPreview, setShowPhotoPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ref to block the profile-fetch from overwriting while upload is in progress
    const uploadingRef = useRef(false);

    useEffect(() => {
        const storedEmail = localStorage.getItem("user_email");
        if (!storedEmail) {
            router.push("/login");
            return;
        }
        setEmail(storedEmail);

        fetch(`/api/profile?email=${encodeURIComponent(storedEmail)}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                // Don't overwrite the display URL if the user is mid-upload
                if (uploadingRef.current) return;
                if (data?.visuals?.photos?.length > 0) {
                    setPhotoUrl(data.visuals.photos[0]);
                }
            })
            .catch(() => { });
    }, [router]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !email) return;

        // Show local preview immediately
        const localPreview = URL.createObjectURL(file);
        setPhotoUrl(localPreview);
        uploadingRef.current = true;
        setUploadingPhoto(true);

        try {
            const compressed = await compressImage(file);

            const fd = new FormData();
            fd.append('file', compressed);
            fd.append('userId', email);

            const res = await fetch('/api/upload', { method: 'POST', body: fd });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('[profile] Upload failed:', errData);
                // blob preview stays — user still sees their selection
            } else {
                const data = await res.json();
                if (data?.url) {
                    // Switch to the permanent server URL
                    setPhotoUrl(data.url);
                    // Revoke blob after a delay to avoid blank-frame during swap
                    setTimeout(() => URL.revokeObjectURL(localPreview), 8000);
                }
            }

        } catch (err: any) {
            console.error('[profile] Photo update error:', err);
            // blob stays visible on error
        } finally {
            uploadingRef.current = false;
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user_email");
        router.push("/login");
    };

    const handleShareProfile = () => {
        if (!email) return;
        const shareUrl = `${window.location.origin}/profile/${encodeURIComponent(email)}`;
        const shareText = `Check out my profile on SkillLinkr: ${shareUrl}`;
        if (navigator.share) {
            navigator.share({ title: 'My SkillLinkr Profile', text: shareText, url: shareUrl });
        } else {
            const action = window.confirm('Share on WhatsApp? (Cancel to copy link)');
            if (action) {
                window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
            } else {
                navigator.clipboard.writeText(shareUrl);
            }
        }
    };

    if (!email) return null;

    return (
        <>
            <div className="p-4 space-y-6 pb-24">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {/* Main photo - click to preview */}
                            <div
                                className="h-12 w-12 rounded-full cursor-pointer"
                                onClick={() => photoUrl && setShowPhotoPreview(true)}
                            >
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover border-2 border-emerald-500" />
                                ) : (
                                    <div className="h-12 w-12 bg-emerald-500/10 rounded-full text-emerald-500 flex items-center justify-center">
                                        <UserIcon className="h-6 w-6" />
                                    </div>
                                )}
                            </div>

                            {/* Pencil edit button at bottom-right */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                                className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-md"
                                disabled={uploadingPhoto}
                            >
                                {uploadingPhoto ? (
                                    <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                                ) : (
                                    <Edit2 className="h-2.5 w-2.5" />
                                )}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                                disabled={uploadingPhoto}
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Your Profile</h1>
                            <p className="text-xs text-muted-foreground">{email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handleShareProfile} className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" title="Share Profile">
                            <Share2 className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Single page editor */}
                <div className="relative">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/5 via-background to-background" />
                    <ProfileEditor email={email} />
                </div>
            </div>

            {/* Photo Preview Modal */}
            {showPhotoPreview && photoUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setShowPhotoPreview(false)}
                >
                    <button
                        onClick={() => setShowPhotoPreview(false)}
                        className="absolute top-4 right-4 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={photoUrl}
                        alt="Profile Preview"
                        className="max-w-full max-h-full rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
