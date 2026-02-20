
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, User, Crown } from "lucide-react"

type Creator = {
    id: string
    first_name: string
    last_name: string
    photos: string[]
    short_bio?: string
}

type TeamMember = {
    user: {
        id: string
        first_name: string
        last_name: string
        photos: string[]
        professionalDetails?: {
            role?: string
            company?: string
        }
    }
}

interface TeamMembersModalProps {
    isOpen: boolean
    onClose: () => void
    members: TeamMember[]
    creator?: Creator | null
    teamName: string
    onMemberClick: (member: TeamMember) => void
    onCreatorClick?: (creator: Creator) => void
    onChat?: () => void
}

export function TeamMembersModal({ isOpen, onClose, members, creator, teamName, onMemberClick, onCreatorClick, onChat }: TeamMembersModalProps) {
    if (!isOpen) return null

    const totalCount = (members?.length || 0) + (creator ? 1 : 0)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="w-full max-w-md bg-card border rounded-3xl overflow-hidden shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                        <div>
                            <h2 className="text-lg font-bold">Team Members</h2>
                            <p className="text-xs text-muted-foreground">
                                {teamName} · {totalCount} {totalCount === 1 ? 'member' : 'members'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Member List */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                        {/* Creator / Team Lead — always first */}
                        {creator && (
                            <div
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200 border border-amber-500/20 bg-amber-500/5"
                                onClick={() => onCreatorClick?.(creator)}
                            >
                                <div className="relative h-11 w-11 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                    {creator.photos?.[0] ? (
                                        <img src={creator.photos[0]} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-amber-500/20 text-amber-500">
                                            <User className="h-5 w-5" />
                                        </div>
                                    )}
                                    {/* Crown badge */}
                                    <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 rounded-full p-0.5">
                                        <Crown className="h-2.5 w-2.5 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm">
                                        {creator.first_name} {creator.last_name}
                                    </h3>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Team Lead</p>
                                </div>
                            </div>
                        )}

                        {/* Approved Members */}
                        {members && members.length > 0 ? (
                            members.filter(m => m && m.user).map((member, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200"
                                    onClick={() => onMemberClick(member)}
                                >
                                    <div className="h-11 w-11 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                        {member.user.photos?.[0] ? (
                                            <img src={member.user.photos[0]} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm">
                                            {member.user.first_name || 'Unknown'} {member.user.last_name || 'User'}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {member.user.professionalDetails?.role || 'Member'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            !creator && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No other members yet. Be the first to join!
                                </div>
                            )
                        )}

                        {/* If creator exists but no other members */}
                        {creator && (!members || members.length === 0) && (
                            <div className="text-center py-4 text-muted-foreground text-xs">
                                No other members yet.
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {onChat && (
                        <div className="p-4 border-t bg-muted/20">
                            <button
                                onClick={onChat}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                            >
                                <span className="text-xl">💬</span>
                                Chat with Team
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
