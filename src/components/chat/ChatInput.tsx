
"use client"

import { useState, useRef } from "react"
import { Send, Smile, Paperclip, Loader2, X } from "lucide-react"
import { useChat } from "@/context/ChatContext"


// Initialize Supabase Client for Storage
// Initialize Supabase Client for Storage
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// import { createClient } from "@supabase/supabase-js"
// const supabase = createClient(supabaseUrl, supabaseKey)

const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Calculate new dimensions (max 1920)
            const MAX_SIZE = 1920;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Compression failed'));
                    return;
                }
                const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                resolve(compressedFile);
            }, 'image/jpeg', 0.7); // 0.7 quality
        };
        img.onerror = (error) => reject(error);
    });
};

export function ChatInput() {
    const [message, setMessage] = useState("")
    const { sendMessage, selectedConversationId, userId, sendTypingEvent } = useChat()
    const [sending, setSending] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Handle File Selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !selectedConversationId) return

        let file = e.target.files[0]

        // 1. File Size Check (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("File size too large. Maximum size is 5MB.")
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        setIsUploading(true)

        try {
            // 2. Upload via API
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Upload failed')

            const data = await res.json()
            const publicUrl = data.url

            // 3. Determine Type
            let attachmentType: 'image' | 'video' | 'file' = 'file'
            if (file.type.startsWith('image/')) attachmentType = 'image'
            else if (file.type.startsWith('video/')) attachmentType = 'video'

            // 4. Send Message with Attachment
            // Note: We need to update ChatContext.tsx to accept type and attachmentUrl
            await sendMessage(
                attachmentType === 'image' ? 'Sent an image' : `Sent a file: ${file.name}`,
                attachmentType,
                publicUrl,
                { fileName: file.name, fileSize: file.size }
            )

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = ''

        } catch (error) {
            console.error("Upload failed", error)
            alert("Failed to upload file")
        } finally {
            setIsUploading(false)
        }
    }

    const handleSend = async () => {
        if (!message.trim() || !selectedConversationId || sending) return

        setSending(true)
        await sendMessage(message.trim(), 'text')
        setMessage("")
        setSending(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!selectedConversationId) return null

    return (
        <div className="p-4 bg-background border-t">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*,application/pdf"
                onChange={handleFileSelect}
            />

            <div className="flex items-end gap-2 bg-muted/50 p-2 rounded-2xl border border-transparent focus-within:border-primary/50 transition-colors">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || sending}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                >
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </button>

                <textarea
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value)

                        // Handle Typing Indicator
                        if (e.target.value.trim().length > 0) {
                            sendTypingEvent(true)

                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                            typingTimeoutRef.current = setTimeout(() => {
                                sendTypingEvent(false)
                            }, 2000)
                        } else {
                            sendTypingEvent(false)
                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[24px] py-2 text-sm focus:outline-none"
                    rows={1}
                />

                <button
                    onClick={handleSend}
                    disabled={(!message.trim() && !isUploading) || sending}
                    className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
