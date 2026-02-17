"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

// --- Interfaces ---
// Structure of a team member with their profile
interface Member {
    user_id: string
    role: string
    joined_at: string
    profiles: {
        id: string
        first_name: string
        last_name: string
        photos: string[]
        headline?: string
    } | null
}

interface GroupMembersModalProps {
    members: Member[]
    onClose: () => void
    onMemberClick: (userId: string) => void
    title?: string
}

/**
 * GroupMembersModal Component
 * 
 * Displays a list of members in a group chat/team.
 * Features:
 * 1. Fixed positioning overlay
 * 2. Framer Motion animations for entry/exit
 * 3. Scrollable list of members
 * 4. Admin badge for creators/admins
 */
export function GroupMembersModal({ members, onClose, onMemberClick, title = "Group Members" }: GroupMembersModalProps) {
    return (
        // z-[9999] ensures it sits on top of everything, including sticky headers
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">

            {/* --- Backdrop --- */}
            {/* Darkens the background and closes modal on click */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* --- Modal Content --- */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header Section */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h3 className="font-semibold text-lg text-white">
                        {title} ({members.length})
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Members List Container */}
                <div className="overflow-y-auto p-2">
                    {members.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No members found.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {members.map((member) => {
                                const profile = member.profiles

                                // --- Name Fallback Logic ---
                                // Precedence: Profile Name -> Email Prefix -> Empty String
                                let name = profile
                                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                                    : ''

                                if (!name) {
                                    name = member.user_id.split('@')[0]
                                }

                                const photo = profile?.photos?.[0]
                                const role = member.role

                                return (
                                    <button
                                        key={member.user_id}
                                        onClick={() => onMemberClick(member.user_id)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors text-left"
                                    >
                                        {/* Avatar Section */}
                                        <div className="relative shrink-0">
                                            {photo ? (
                                                <img
                                                    src={photo}
                                                    alt={name}
                                                    className="w-10 h-10 rounded-full object-cover border"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {name[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}

                                            {/* ADMIN Badge Logic */}
                                            {/* Only shows for 'admin' or 'creator' roles */}
                                            {role === "admin" || role === "creator" ? (
                                                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold border border-zinc-900">
                                                    ADMIN
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Member Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white break-words">
                                                {name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {profile?.headline || role}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
