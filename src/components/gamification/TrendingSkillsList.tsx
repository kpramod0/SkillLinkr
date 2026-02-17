"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Award, Code, Database, Layout, Server, Brain, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrendingSkill {
    name: string
    count: number
}

export function TrendingSkillsList() {
    const [skills, setSkills] = useState<TrendingSkill[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const res = await fetch('/api/skills/trending')
                if (res.ok) {
                    const data = await res.json()
                    setSkills(data)
                }
            } catch (error) {
                console.error("Failed to fetch skills", error)
            } finally {
                setLoading(false)
            }
        }

        fetchSkills()
    }, [])

    const maxCount = skills.length > 0 ? skills[0].count : 1

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl" />
                ))}
            </div>
        )
    }

    if (skills.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No skill data available yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-indigo-500">Market Insights</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    These are the most in-demand skills at KIIT right now. Learn these to match with more teams!
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {skills.map((skill, index) => {
                    const percentage = Math.round((skill.count / maxCount) * 100)

                    return (
                        <div
                            key={skill.name}
                            className="relative overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 transition-all hover:scale-[1.01]"
                        >
                            {/* Progress Bar Background */}
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-primary/5 transition-all duration-1000 ease-out"
                                style={{ width: `${percentage}%` }}
                            />

                            <div className="relative flex items-center justify-between z-10">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border",
                                        index === 0 ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/50" :
                                            index === 1 ? "bg-slate-400/20 text-slate-500 border-slate-400/50" :
                                                index === 2 ? "bg-amber-700/20 text-amber-700 border-amber-700/50" :
                                                    "bg-muted text-muted-foreground border-border"
                                    )}>
                                        #{index + 1}
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="font-bold text-base">{skill.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {index < 3 ? "🔥 High Demand" : "Trending"}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="block font-bold text-lg text-primary">{skill.count}</span>
                                    <span className="text-[10px] uppercase text-muted-foreground font-medium">Students</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
