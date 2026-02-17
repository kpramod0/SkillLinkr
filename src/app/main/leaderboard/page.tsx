"use client"

import { useEffect, useState } from "react"
import { UserProfile } from "@/types"
import { LeaderboardCard } from "@/components/gamification/LeaderboardCard"
import { Trophy, TrendingUp, Medal } from "lucide-react"

import { TrendingSkillsList } from "@/components/gamification/TrendingSkillsList"
import { cn } from "@/lib/utils"

export default function LeaderboardPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'students' | 'skills'>('students')
    const [myRankData, setMyRankData] = useState<{ rank: number, reputation: number, profile: UserProfile } | null>(null)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch Top 5
                const res = await fetch('/api/leaderboard?limit=5')
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()
                setUsers(data)

                // Fetch My Rank
                const userId = localStorage.getItem('user_email');
                if (userId) {
                    const rankRes = await fetch(`/api/leaderboard?myRank=true&userId=${userId}`)
                    if (rankRes.ok) {
                        const rankData = await rankRes.json()
                        setMyRankData(rankData)
                    }
                }

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchLeaderboard()
    }, [])

    return (
        <div className="pb-32 pt-4 px-4 max-w-2xl mx-auto min-h-screen relative">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-tighter flex items-center justify-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    Rankings
                </h1>
                <p className="text-muted-foreground mt-2">Top 5 Performers</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-muted/50 rounded-xl mb-8">
                <button
                    onClick={() => setActiveTab('students')}
                    className={cn(
                        "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'students'
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Top Students
                </button>
                <button
                    onClick={() => setActiveTab('skills')}
                    className={cn(
                        "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'skills'
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Trending Skills
                </button>
            </div>

            {activeTab === 'students' ? (
                <>
                    {loading ? (
                        <div className="flex flex-col gap-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {users.map((user, index) => (
                                <LeaderboardCard key={user.id} profile={user} rank={index + 1} />
                            ))}

                            {users.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No rankings yet. Be the first to earn reputation!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* My Rank Sticky Card */}
                    {myRankData && (
                        <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto z-40">
                            <div className="bg-gradient-to-r from-zinc-900 to-black border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden">
                                {/* Glow Effect */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                                <div className="flex flex-col items-center justify-center w-12 shrink-0">
                                    <span className="text-xs text-muted-foreground font-bold uppercase">Rank</span>
                                    <span className="text-2xl font-black text-white">#{myRankData.rank}</span>
                                </div>

                                <div className="h-10 w-[1px] bg-white/10" />

                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg">You</h3>
                                    <p className="text-xs text-muted-foreground">Keep climbing the ladder!</p>
                                </div>

                                <div className="text-right">
                                    <div className="text-xl font-bold text-primary">{myRankData.reputation}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">REP</div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <TrendingSkillsList />
            )}
        </div>
    )
}
