
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, User } from "lucide-react"

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
    teamName: string
    onMemberClick: (member: TeamMember) => void
    onChat?: () => void
}

export function TeamMembersModal({ isOpen, onClose, members, teamName, onMemberClick, onChat }: TeamMembersModalProps) {
    if (!isOpen) return null

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
                            <p className="text-xs text-muted-foreground">{teamName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Member List */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                        {members && members.length > 0 ? (
                            members.map((member, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer active:scale-95 duration-200"
                                    onClick={() => onMemberClick(member)}
                                >
                                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                        {member.user.photos?.[0] ? (
                                            <img src={member.user.photos[0]} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
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
                            <div className="text-center py-8 text-muted-foreground">
                                No members yet. Be the first to join!
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
