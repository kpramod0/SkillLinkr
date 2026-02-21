"use client"

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion"
import { Check, X, Users, Calendar, Briefcase, Star, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface Team {
    id: number
    creator: {
        id: string
        first_name: string
        last_name: string
        photos: string[]
        short_bio?: string
    }
    title: string
    description: string
    event_name?: string
    roles_needed: string[]
    skills_required: string[]
    status: 'open' | 'closed'
    members?: { user: { id: string, photos: string[] } }[]
}

interface TeamCardProps {
    team: Team
    onSwipe: (direction: "left" | "right") => void
    onClick?: () => void
    style?: React.CSSProperties
    exitDirection?: "left" | "right" | null
    currentUserId?: string | null
}

export function TeamCard({ team, onSwipe, onClick, style, exitDirection, currentUserId }: TeamCardProps) {
    const router = useRouter()
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-25, 25])
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

    const likeOpacity = useTransform(x, [10, 100], [0, 1])
    const nopeOpacity = useTransform(x, [-10, -100], [0, 1])

    const handleDragEnd = (event: any, info: PanInfo) => {
        const threshold = 100
        if (info.offset.x > threshold) {
            onSwipe("right")
        } else if (info.offset.x < -threshold) {
            onSwipe("left")
        }
    }

    const [isOwner, setIsOwner] = useState(false)

    useEffect(() => {
        if (currentUserId && team.creator && team.creator.id === currentUserId) {
            setIsOwner(true);
        }
    }, [team.creator, currentUserId]);

    const getExitAnimation = () => {
        if (exitDirection === "right") return { x: 500, rotate: 30, opacity: 0 }
        if (exitDirection === "left") return { x: -500, rotate: -30, opacity: 0 }
        return { x: 0, opacity: 0, scale: 0.8 }
    }

    return (
        <motion.div
            style={{ x, rotate, ...style }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            onClick={onClick}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={getExitAnimation()}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing perspective-1000"
        >
            <div className="w-full h-full relative rounded-3xl overflow-hidden bg-card shadow-xl border border-border/50 flex flex-col">

                {/* Header Image / Pattern - Percentage Height */}
                <div className="h-[35%] w-full bg-gradient-to-br from-indigo-600 to-purple-700 relative p-6 flex flex-col justify-end shrink-0">
                    <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1">
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1 leading-tight line-clamp-2">{team.title}</h2>
                    {team.event_name && (
                        <div className="flex items-center gap-1.5 text-white/80 text-sm">
                            <Calendar className="h-3.5 w-3.5" />
                            {team.event_name}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 bg-background flex flex-col gap-3 overflow-y-auto scrollbar-hide min-h-0">

                    {/* Creator Info */}
                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                        <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                            {team.creator?.photos?.[0] ? (
                                <img src={team.creator.photos[0]} alt={team.creator.first_name || 'User'} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                    {team.creator?.first_name?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground font-medium">Team Lead</div>
                            <div className="text-sm font-semibold">
                                {team.creator ? `${team.creator.first_name} ${team.creator.last_name}` : 'Unknown User'}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-muted-foreground leading-relaxed">
                        {team.description}
                    </div>

                    {/* Roles Needed */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" /> Looking For
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {team.roles_needed.map((role, i) => (
                                <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Skills Required */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" /> Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {team.skills_required.map((skill, i) => (
                                <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-medium">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Action Hint */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Swipe Right to Apply</span>

                    {/* Manage Button for Creator */}
                    {isOwner && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/main/teams/${team.id}/dashboard`);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors z-20 relative"
                        >
                            <Settings className="h-3 w-3" /> Manage
                        </button>
                    )}
                </div>

                {/* Swipe Indicators */}
                <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-emerald-500 text-emerald-500 rounded-lg px-4 py-2 font-bold text-2xl -rotate-12 bg-black/20 backdrop-blur-sm z-10">
                    APPLY
                </motion.div>
                <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-lg px-4 py-2 font-bold text-2xl rotate-12 bg-black/20 backdrop-blur-sm z-10">
                    SKIP
                </motion.div>

            </div>
        </motion.div>
    )
}
