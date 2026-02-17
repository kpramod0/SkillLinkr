"use client"

import { UserProfile } from "@/types"
import { Crown, Medal, Trophy } from "lucide-react"

interface LeaderboardCardProps {
    profile: UserProfile
    rank: number
}

export function LeaderboardCard({ profile, rank }: LeaderboardCardProps) {
    const isTop3 = rank <= 3

    let RankIcon = null
    let rankColor = ""
    let borderColor = ""

    if (rank === 1) {
        RankIcon = Crown
        rankColor = "text-yellow-500"
        borderColor = "border-yellow-500/50 bg-yellow-500/10"
    } else if (rank === 2) {
        RankIcon = Medal
        rankColor = "text-slate-400"
        borderColor = "border-slate-400/50 bg-slate-400/10"
    } else if (rank === 3) {
        RankIcon = Trophy
        rankColor = "text-amber-700"
        borderColor = "border-amber-700/50 bg-amber-700/10"
    } else {
        borderColor = "border-border/40 bg-card/50"
    }

    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${borderColor} backdrop-blur-sm transition-all hover:scale-[1.01]`}>
            {/* Rank */}
            <div className={`flex-shrink-0 w-8 flex flex-col items-center justify-center font-bold ${rankColor || "text-muted-foreground"}`}>
                {RankIcon ? <RankIcon className="h-6 w-6 mb-1" /> : <span className="text-xl">#{rank}</span>}
            </div>

            {/* Avatar */}
            <div className="relative h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-muted border border-border">
                {profile.visuals?.photos && profile.visuals.photos.length > 0 ? (
                    <img src={profile.visuals.photos[0]} alt={profile.personal.firstName} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                        {profile.personal?.firstName?.[0] || "?"}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate">
                    {profile.personal?.firstName || profile.id?.split('@')[0] || "Unknown"} {profile.personal?.lastName || ""}
                    {profile.professionalDetails?.year && <span className="text-xs font-normal text-muted-foreground ml-2">{profile.professionalDetails.year} Year</span>}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                    {profile.professionalDetails?.domains?.slice(0, 2).join(", ") || "Student"}
                </p>
            </div>

            {/* Score */}
            <div className="text-right">
                <span className="block font-black text-xl text-primary">{profile.reputation || 0}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rep</span>
            </div>
        </div>
    )
}
