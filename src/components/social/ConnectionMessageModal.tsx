"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, MessageCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserProfile } from "@/types"

const PREDEFINED_MESSAGES = [
    "Hey! Let's collaborate on a project together 🚀",
    "I'd love to team up for a hackathon! 🏆",
    "Your skills look great, let's connect! 💡",
    "Interested in working together on something cool! 🤝",
]

const MAX_CUSTOM_LENGTH = 200

interface ConnectionMessageModalProps {
    profile: UserProfile
    onConfirm: (message?: string) => void
    onCancel: () => void
}

export function ConnectionMessageModal({ profile, onConfirm, onCancel }: ConnectionMessageModalProps) {
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
    const [customMessage, setCustomMessage] = useState("")
    const [isCustom, setIsCustom] = useState(false)
    const [sending, setSending] = useState(false)

    const activeMessage = isCustom ? customMessage.trim() : selectedMessage

    const handleSelectPredefined = (msg: string) => {
        setIsCustom(false)
        setSelectedMessage(msg === selectedMessage ? null : msg)
    }

    const handleCustomFocus = () => {
        setIsCustom(true)
        setSelectedMessage(null)
    }

    const handleConfirm = async () => {
        setSending(true)
        await onConfirm(activeMessage || undefined)
    }

    const handleSkip = async () => {
        setSending(true)
        await onConfirm(undefined)
    }

    const firstName = profile.personal.firstName
    const photo = profile.visuals?.photos?.[0]

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {photo ? (
                                <img src={photo} alt={firstName} className="h-10 w-10 rounded-full object-cover border border-border" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                    {firstName[0]}
                                </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                                <MessageCircle className="h-2.5 w-2.5 text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Send a note to {firstName}</p>
                            <p className="text-xs text-muted-foreground">Stand out with a personal message</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={sending}
                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Predefined Messages */}
                <div className="px-4 pt-3 pb-2 space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-muted-foreground">Quick messages</span>
                    </div>
                    {PREDEFINED_MESSAGES.map((msg) => (
                        <button
                            key={msg}
                            onClick={() => handleSelectPredefined(msg)}
                            disabled={sending}
                            className={`w-full text-left text-sm px-3.5 py-2.5 rounded-xl border transition-all duration-200 ${selectedMessage === msg && !isCustom
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                                : "border-border/50 bg-muted/30 hover:bg-muted/60 text-foreground"
                                }`}
                        >
                            {msg}
                        </button>
                    ))}
                </div>

                {/* Custom Message */}
                <div className="px-4 py-3">
                    <div className="relative">
                        <textarea
                            placeholder="Or write your own message..."
                            value={customMessage}
                            onFocus={handleCustomFocus}
                            onChange={(e) => {
                                if (e.target.value.length <= MAX_CUSTOM_LENGTH) {
                                    setCustomMessage(e.target.value)
                                }
                            }}
                            disabled={sending}
                            rows={2}
                            className={`w-full text-sm px-3.5 py-2.5 rounded-xl border resize-none bg-muted/30 focus:outline-none transition-all duration-200 ${isCustom && customMessage.trim()
                                ? "border-emerald-500 ring-1 ring-emerald-500/30"
                                : "border-border/50 focus:border-border"
                                }`}
                        />
                        {isCustom && (
                            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                                {customMessage.length}/{MAX_CUSTOM_LENGTH}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-6 pt-1 flex gap-3">
                    <button
                        onClick={handleSkip}
                        disabled={sending}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-3 disabled:opacity-50"
                    >
                        Skip
                    </button>
                    <Button
                        onClick={handleConfirm}
                        disabled={sending || (!activeMessage)}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 rounded-xl h-11 font-semibold text-sm gap-2 disabled:opacity-50"
                    >
                        {sending ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Send Request
                            </>
                        )}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    )
}
