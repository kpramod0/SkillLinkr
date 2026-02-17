"use client"

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion"
import { UserProfile } from "@/types"
import { Check, X, Star, MapPin, Briefcase } from "lucide-react"

interface SwipeCardProps {
    profile: UserProfile
    onSwipe: (direction: "left" | "right") => void
    onClick?: () => void
    style?: React.CSSProperties
    exitDirection?: "left" | "right" | null
}

export function SwipeCard({ profile, onSwipe, onClick, style, exitDirection }: SwipeCardProps) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-25, 25])
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

    // Visual indicators
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

    // Calculate exit animation values based on direction
    const getExitAnimation = () => {
        if (exitDirection === "right") {
            return { x: 500, rotate: 30, opacity: 0 }
        }
        if (exitDirection === "left") {
            return { x: -500, rotate: -30, opacity: 0 }
        }
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
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                opacity: { duration: 0.3 }
            }}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing perspective-1000"
        >
            <div className="w-full h-full relative rounded-3xl overflow-hidden bg-card shadow-xl border border-border/50">

                {/* Photo Area - Takes up all available space, image covers */}
                <div className="absolute inset-0 w-full h-full bg-muted">
                    {profile.visuals.photos && profile.visuals.photos.length > 0 ? (
                        <img
                            src={profile.visuals.photos[0]}
                            alt={profile.personal.firstName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <>
                            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20`} />
                            <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold opacity-10">
                                {profile.personal.firstName[0]}
                            </div>
                        </>
                    )}

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/60 to-transparent" />
                </div>

                {/* Content Area */}
                <div className="absolute bottom-0 left-0 w-full p-6 text-white z-10 flex flex-col justify-end h-full pointer-events-none">
                    <div className="pointer-events-auto">
                        <div className="flex items-end justify-between mb-2">
                            <div>
                                <h2 className="text-3xl font-bold flex items-center gap-2">
                                    {profile.personal.firstName}, {profile.personal.age}
                                    <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                                        {profile.professionalDetails.year} Yr
                                    </span>
                                </h2>
                                <p className="text-white/80 font-medium">
                                    {profile.professionalDetails.domains[0]} • {profile.professionalDetails.year} Yr
                                </p>
                            </div>
                        </div>

                        {/* Open To Badges (Mini) */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {(profile.professionalDetails.openTo || []).slice(0, 3).map(badge => (
                                <span key={badge} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white font-medium">
                                    {badge}
                                </span>
                            ))}
                        </div>

                        {profile.visuals.bio && (
                            <p className="text-sm text-white/70 line-clamp-2 mb-4">
                                {profile.visuals.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2 mb-20">
                            {/* Show Top Skills */}
                            {(profile.professionalDetails.skills || []).slice(0, 3).map(s => (
                                <span key={s.name} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200">
                                    <Star className="h-3 w-3 fill-current" />
                                    {s.name}
                                </span>
                            ))}
                            {/* Show Domains */}
                            {profile.professionalDetails.domains.slice(0, 2).map(d => (
                                <span key={d} className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                                    {d}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Swipe Indicators */}
                <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-emerald-500 text-emerald-500 rounded-lg px-4 py-2 font-bold text-2xl -rotate-12 bg-black/20 backdrop-blur-sm z-10">
                    LIKE
                </motion.div>
                <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-lg px-4 py-2 font-bold text-2xl rotate-12 bg-black/20 backdrop-blur-sm z-10">
                    NOPE
                </motion.div>

            </div>
        </motion.div>
    )
}
