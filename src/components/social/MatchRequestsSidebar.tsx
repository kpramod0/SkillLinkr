"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, X, MessageCircle } from "lucide-react"
import { UserProfile } from "@/types"
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MatchRequest {
    requestId: string
    type: "like" | "team_application"
    userId: string
    userName: string
    userPhoto: string
    userInitial: string
    timestamp: string
    bio?: string
    domains?: string[]
    joinNote?: string
    fullProfile: any
}

export function MatchRequestsSidebar() {
    const router = useRouter()
    const [requests, setRequests] = useState<MatchRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
    const [selectedMessage, setSelectedMessage] = useState<{ name: string; message: string } | null>(null)

    const getAuthHeaders = async () => {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    const fetchRequests = async () => {
        try {
            const email = localStorage.getItem("user_email")
            if (!email) return

            const headers = await getAuthHeaders()
            const res = await fetch(`/api/likes?userId=${email}`, { headers: headers as HeadersInit })
            if (!res.ok) return

            const data = await res.json()
            const list = Array.isArray(data) ? data : []

            const mapped: MatchRequest[] = list.map((item: any) => {
                const requestId = item.requestId || (item.isTeamApplication ? `teamapp_${item.applicationId}` : `like_${item.id}`)
                const type: MatchRequest["type"] = item.requestType === "team_application" || item.isTeamApplication ? "team_application" : "like"

                const first = item.personal?.firstName || ""
                const last = item.personal?.lastName || ""

                return {
                    requestId,
                    type,
                    userId: item.id, // REAL user id (applicant/swiper)
                    userName: `${first} ${last}`.trim() || "Unknown",
                    userPhoto: item.visuals?.photos?.[0] || "",
                    userInitial: first?.[0] || "?",
                    timestamp: item.likedAt || new Date().toISOString(),
                    bio: item.visuals?.bio || "",
                    domains: item.professional?.domains || [],
                    joinNote: item.joinNote || undefined,
                    fullProfile: item,
                }
            })

            setRequests(mapped)
        } catch (error) {
            console.error("Failed to fetch requests", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()

        const email = localStorage.getItem("user_email")
        if (!email) return

        // Instant refresh: listen to notifications for me
        const channel = supabase
            .channel(`notifications_${email}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${email}` },
                () => {
                    fetchRequests()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleAction = async (requestId: string, action: "match" | "pass") => {
        // Optimistic remove
        const reqItem = requests.find((r) => r.requestId === requestId)
        setRequests((prev) => prev.filter((r) => r.requestId !== requestId))

        try {
            const email = localStorage.getItem("user_email")
            if (!email || !reqItem) return

            const headers = { "Content-Type": "application/json", ...(await getAuthHeaders()) }

            if (reqItem.type === "team_application") {
                const applicationId = reqItem.fullProfile?.applicationId
                if (!applicationId) return

                const res = await fetch("/api/teams/application-status", {
                    method: "POST",
                    headers: headers as HeadersInit,
                    body: JSON.stringify({
                        userId: email,
                        applicationId,
                        action: action === "match" ? "approve" : "reject",
                    }),
                })

                if (!res.ok) {
                    console.error("Team application action failed:", await res.text())
                }
            } else {
                // Like request: confirm means "like back"
                await fetch("/api/interactions", {
                    method: "POST",
                    headers: headers as HeadersInit,
                    body: JSON.stringify({
                        userId: email,
                        targetId: reqItem.userId,
                        action: action === "match" ? "like" : "pass",
                    }),
                })
            }

            if (action === "match") {
                // Instantly move to chat section
                setTimeout(() => router.push('/main/chat'), 500)
            }
        } catch (error) {
            console.error(`Failed to ${action} request`, error)
        }
    }

    if (loading) {
        return (
            <div className="p-4 space-y-4">
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-[4/5] bg-muted rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (requests.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No pending requests</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="p-4 flex items-center justify-between border-b border-border/40">
                <h2 className="font-semibold text-sm">Requests</h2>
                <span className="text-xs font-bold text-red-500">{requests.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                <AnimatePresence mode="popLayout">
                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {requests.map((req) => (
                            <motion.div
                                key={req.requestId}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                className="flex flex-col gap-3 p-3 bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow relative group"
                            >
                                <div
                                    onClick={() => setSelectedProfile(req.fullProfile)}
                                    className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted relative cursor-pointer"
                                >
                                    {req.userPhoto ? (
                                        <img
                                            src={req.userPhoto}
                                            alt={req.userName}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                                            {req.userInitial}
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent pt-8">
                                        <p className="text-white text-xs font-bold truncate">{req.userName}</p>
                                        <p className="text-white/80 text-[10px] truncate">{req.domains?.[0] || "Student"}</p>
                                    </div>
                                </div>

                                {req.joinNote && (
                                    <div
                                        onClick={() => setSelectedMessage({ name: req.userName, message: req.joinNote! })}
                                        className="bg-muted/50 rounded-md p-2 text-[10px] italic text-muted-foreground line-clamp-2 min-h-[40px] cursor-pointer hover:bg-muted/80 transition-colors border border-transparent hover:border-border/50"
                                    >
                                        "{req.joinNote}"
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 mt-auto">
                                    <button
                                        onClick={() => handleAction(req.requestId, "match")}
                                        className="w-full bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.requestId, "pass")}
                                        className="w-full bg-muted text-muted-foreground text-xs font-medium py-2 rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {selectedProfile && <ProfileDetailModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
            </AnimatePresence>

            <AnimatePresence>
                {selectedMessage && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedMessage(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-xs bg-card border rounded-2xl shadow-xl p-6 z-10"
                        >
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="absolute top-2 right-2 p-2 hover:bg-muted rounded-full text-muted-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="flex flex-col gap-4 text-center">
                                <div className="h-12 w-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                                    <MessageCircle className="h-6 w-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">{selectedMessage.name}</h3>
                                    <p className="text-sm text-foreground/90 italic p-4 bg-muted/50 rounded-xl">
                                        "{selectedMessage.message}"
                                    </p>
                                </div>
                                <button onClick={() => setSelectedMessage(null)} className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
