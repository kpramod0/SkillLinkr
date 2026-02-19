"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Users, ExternalLink, Share2, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface MyTeamsModalProps {
    isOpen: boolean
    onClose: () => void
}

interface TeamSync {
    id: number
    title: string
    status: 'open' | 'closed'
    creator_id?: string
    member_count: number
    members?: any[]
}

export function MyTeamsModal({ isOpen, onClose }: MyTeamsModalProps) {
    const [teams, setTeams] = useState<TeamSync[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<number | null>(null)
    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            fetchMyTeams()
        }
    }, [isOpen])

    const fetchMyTeams = async () => {
        setLoading(true)
        try {
            const email = localStorage.getItem("user_email")
            if (!email) return

            // Use filter=mine to get only teams I created or joined
            const res = await fetch(`/api/teams?filter=mine&userId=${encodeURIComponent(email)}`, {
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                const myTeams = await res.json()
                setTeams(myTeams)
            }
        } catch (error) {
            console.error("Failed to fetch my teams", error)
        } finally {
            setLoading(false)
        }
    }

    const handleShare = async (teamId: number, title: string) => {
        const url = `${window.location.origin}/main/teams/${teamId}/dashboard`
        try {
            await navigator.clipboard.writeText(`${title} - Join my team on Collexa!\n\n${url}`)
            setCopiedId(teamId)
            setTimeout(() => setCopiedId(null), 2000)
        } catch (err) {
            console.error("Failed to copy", err)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative bg-background w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border z-50 flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h2 className="text-xl font-bold">My Teams</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : teams.length > 0 ? (
                        teams.map((team) => (
                            <div key={team.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-muted/30 transition-colors">
                                <div>
                                    <h3 className="font-semibold text-base mb-1">{team.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {(team.member_count ?? team.members?.length ?? 0)} Member{(team.member_count ?? team.members?.length ?? 0) !== 1 ? 's' : ''}
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded-full border ${team.status === 'open' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                            {team.status === 'open' ? 'Recruiting' : 'Closed'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 h-8"
                                        onClick={() => handleShare(team.id, team.title)}
                                    >
                                        {copiedId === team.id ? (
                                            <span className="text-green-600">Copied</span>
                                        ) : (
                                            <>
                                                <Share2 className="h-3.5 w-3.5" />
                                                <span className="sr-only sm:not-sr-only sm:inline-block">Share</span>
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="gap-2 h-8"
                                        onClick={() => {
                                            router.push(`/main/teams/${team.id}/dashboard`)
                                            onClose()
                                        }}
                                    >
                                        Manage
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>You haven't created any teams yet.</p>
                            <Button variant="link" onClick={() => { onClose() }}>
                                Create one by clicking + Post
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
