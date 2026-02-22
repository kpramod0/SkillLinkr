"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Star, RefreshCcw, Briefcase, Plus } from "lucide-react"
import { SwipeCard } from "./SwipeCard"
import { UserProfile } from "@/types"
import { Button } from "@/components/ui/button"
import { useDiscovery } from "@/context/DiscoveryContext"
import { DiscoveryToggle } from "./DiscoveryToggle"
import { TeamCard } from "./TeamCard"
import { Users } from "lucide-react"
import { mapRowToProfile } from "@/lib/profileUtils"
import { useRouter } from "next/navigation"
import { useChat } from "@/context/ChatContext"
import { createClient } from "@supabase/supabase-js"
import dynamic from "next/dynamic"

const ProfileDetailModal = dynamic(() => import("./ProfileDetailModal").then(mod => mod.ProfileDetailModal))
const ConnectionMessageModal = dynamic(() => import("./ConnectionMessageModal").then(mod => mod.ConnectionMessageModal))
const CreateTeamModal = dynamic(() => import("./CreateTeamModal").then(mod => mod.CreateTeamModal))
const TeamApplicationModal = dynamic(() => import("./TeamApplicationModal").then(mod => mod.TeamApplicationModal))
const TeamMembersModal = dynamic(() => import("./TeamMembersModal").then(mod => mod.TeamMembersModal))
const MyTeamsModal = dynamic(() => import("./MyTeamsModal").then(mod => mod.MyTeamsModal))

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export function SwipeDeck() {
    const router = useRouter()
    const { selectConversation } = useChat()
    const { filters, isLoading: contextLoading, blockedIds } = useDiscovery()
    const [profiles, setProfiles] = useState<UserProfile[]>([])
    const [allTeams, setAllTeams] = useState<any[]>([]) // Store all teams
    const [mode, setMode] = useState<'people' | 'teams' | 'my-teams'>('people')
    const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
    const [myTeamsMembersTarget, setMyTeamsMembersTarget] = useState<any | null>(null)

    const [loading, setLoading] = useState(true)
    // PERF: Separate per-mode loading flags so toggling between already-loaded modes
    // never shows the full spinner — only show spinner on the FIRST load of each mode.
    const [loadedModes, setLoadedModes] = useState<Set<string>>(new Set())
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
    const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null)
    const [isAnimating, setIsAnimating] = useState(false)

    const [messageTarget, setMessageTarget] = useState<UserProfile | null>(null)
    const [teamTarget, setTeamTarget] = useState<any | null>(null)
    const [pendingAction, setPendingAction] = useState<"like" | "star" | null>(null)

    const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    // Derived states
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // When mode is 'teams', allTeams are discovery teams.
    // When mode is 'my-teams', allTeams are my teams.
    // We can just use allTeams directly, but to keep existing render logic safe:
    const discoverableTeams = mode === 'teams' ? allTeams : [];
    const myTeams = mode === 'my-teams' ? allTeams : [];

    // Active deck for swiping (People or Discoverable Teams)
    const activeDeck = mode === 'people' ? profiles : discoverableTeams

    // List Caching for Performance
    const getCachedList = (key: string) => {
        try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache valid for 2 minutes for swiping
                if (Date.now() - timestamp < 2 * 60 * 1000) return data;
            }
        } catch (e) { }
        return null;
    }

    const setCachedList = (key: string, data: any) => {
        try {
            sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) { }
    }

    // Fetch profiles from API
    useEffect(() => {
        const fetchProfiles = async () => {
            const email = localStorage.getItem("user_email")
            const filterParams = new URLSearchParams()
            if (email) filterParams.set('userId', email)

            if (filters.genders?.length > 0 && !filters.genders.includes('Any')) {
                filterParams.set('genders', filters.genders.join(','))
            }
            if (filters.years?.length > 0) {
                filterParams.set('years', filters.years.join(','))
            }
            if (filters.domains?.length > 0) {
                filterParams.set('domains', filters.domains.join(','))
            }

            const cacheKey = `profiles_${filterParams.toString()}`;
            const cached = getCachedList(cacheKey);

            if (cached) {
                setProfiles(cached);
                // PERF: Already have data — mark as loaded immediately, no spinner
                setLoadedModes(prev => new Set(prev).add('people'));
                setLoading(false);
                return;
            }

            // Only show spinner on first load ever for this mode
            if (!loadedModes.has('people')) setLoading(true);

            try {
                const url = `/api/profiles?${filterParams.toString()}`
                const res = await fetch(url)
                if (!res.ok) throw new Error('Failed to fetch profiles')
                const data: UserProfile[] = await res.json()

                // Final safety check (blocked users)
                const filtered = data.filter(p => !blockedIds.has(p.id))

                setProfiles(filtered)
                setCachedList(cacheKey, filtered);
                setLoadedModes(prev => new Set(prev).add('people'));
            } catch (error) {
                console.error("Error fetching swipe profiles:", error)
            } finally {
                setLoading(false)
            }
        }

        const fetchTeams = async () => {
            const email = localStorage.getItem("user_email")
            const filter = mode === 'my-teams' ? 'mine' : 'discover';
            const cacheKey = `teams_${filter}_${email || 'guest'}`;

            const cached = getCachedList(cacheKey);
            if (cached) {
                setAllTeams(cached);
                // PERF: Already have data — mark as loaded, don't show spinner
                setLoadedModes(prev => new Set(prev).add(filter));
                setLoading(false);
                return;
            }

            // Only show spinner on first-ever load for this mode
            if (!loadedModes.has(filter)) setLoading(true);

            try {
                const url = email ? `/api/teams?userId=${email}&filter=${filter}` : `/api/teams?filter=${filter}`

                const headers = await getAuthHeaders()
                const res = await fetch(url, { headers: headers as HeadersInit })

                if (!res.ok) throw new Error('Failed to fetch teams')
                const data = await res.json()
                setAllTeams(data)
                setCachedList(cacheKey, data);
                setLoadedModes(prev => new Set(prev).add(filter));
            } catch (error) {
                console.error("Error fetching teams:", error)
            } finally {
                setLoading(false)
            }
        }

        if (!contextLoading) {
            if (mode === 'people') fetchProfiles()
            else fetchTeams()
        }

        const getUser = async () => {
            const localEmail = localStorage.getItem("user_email")
            if (localEmail) {
                setCurrentUserId(localEmail)
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.email) setCurrentUserId(user.email)
            }
        }
        getUser()
    }, [filters, contextLoading, mode, getAuthHeaders, blockedIds])

    const handleLikeIntent = useCallback((action: "like" | "star") => {
        if (profiles.length === 0 || isAnimating) return
        const currentProfile = profiles[profiles.length - 1]
        setMessageTarget(currentProfile)
        setPendingAction(action)
    }, [profiles, isAnimating])

    const handleSendWithMessage = useCallback(async (message?: string) => {
        if (!messageTarget || !pendingAction) return

        const action = pendingAction
        const target = messageTarget

        setMessageTarget(null)
        setPendingAction(null)

        setIsAnimating(true)
        setExitDirection("right")

        setTimeout(() => {
            setProfiles((prev) => prev.slice(0, -1))
            setExitDirection(null)
            setIsAnimating(false)
        }, 350)

        // Clear profiles cache immediately so swiped profiles don't reappear on refresh
        try {
            const keysToRemove: string[] = []
            for (let i = 0; i < sessionStorage.length; i++) {
                const k = sessionStorage.key(i)
                if (k && k.startsWith('profiles_')) keysToRemove.push(k)
            }
            keysToRemove.forEach(k => sessionStorage.removeItem(k))
        } catch (e) { }

        try {
            const email = localStorage.getItem("user_email")
            if (!email) return

            const body: any = {
                userId: email,
                targetId: target.id,
                action: action === "star" ? "star" : "like",
            }
            if (message) body.message = message

            const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }

            await fetch('/api/interactions', {
                method: 'POST',
                headers: headers as HeadersInit,
                body: JSON.stringify(body)
            })

            if (action === "star") {
                await fetch('/api/interactions', {
                    method: 'POST',
                    headers: headers as HeadersInit,
                    body: JSON.stringify({
                        userId: email,
                        targetId: target.id,
                        action: 'like',
                        message: message || null
                    })
                })
            }
        } catch (error) {
            console.error(`Failed to ${action} user:`, error)
        }
    }, [messageTarget, pendingAction, getAuthHeaders])

    const handleApplyToTeam = useCallback((message: string) => {
        if (!teamTarget) return

        const teamId = teamTarget.id

        // Optimistic UI updates
        setAllTeams(prev => prev.filter(t => t.id !== teamId))
        setTeamTarget(null)

        setIsAnimating(true)
        setExitDirection("right")
        setTimeout(() => {
            setIsAnimating(false)
            setExitDirection(null)
        }, 350)

        const userId = localStorage.getItem("user_email")
        if (!userId) return

        // Always clear the teams discovery cache so the team doesn't reappear on next load.
        // The key must match exactly what fetchTeams uses: `teams_discover_${email}`
        try { sessionStorage.removeItem(`teams_discover_${userId}`) } catch (e) { }

        // IMPORTANT: no await here
        getAuthHeaders()
            .then((authHeaders) => {
                const headers = { "Content-Type": "application/json", ...authHeaders }
                return fetch("/api/teams/apply", {
                    method: "POST",
                    headers: headers as HeadersInit,
                    body: JSON.stringify({ teamId, message, userId }),
                })
            })
            .then(async (res) => {
                if (!res) return
                if (res.status === 409) {
                    // Application already exists — this is safe to ignore silently.
                    // The team has already been removed from the UI via optimistic update.
                    return
                }
                if (!res.ok) {
                    console.error("Apply failed:", await res.text())
                }
            })
            .catch((err) => console.error("Apply error:", err))
    }, [teamTarget, getAuthHeaders])


    const handleCancelMessage = useCallback(() => {
        setMessageTarget(null)
        setTeamTarget(null)
        setPendingAction(null)
    }, [])

    const handleSwipe = useCallback(async (direction: "left" | "right") => {
        if (profiles.length === 0 || isAnimating) return

        if (direction === "right") {
            handleLikeIntent("like")
            return
        }

        const currentProfile = profiles[profiles.length - 1]

        setIsAnimating(true)
        setExitDirection(direction)

        setTimeout(() => {
            setProfiles((prev) => prev.slice(0, -1))
            setExitDirection(null)
            setIsAnimating(false)
        }, 350)

        // Clear profiles cache so this swiped profile doesn't reappear on refresh
        try {
            const keysToRemove: string[] = []
            for (let i = 0; i < sessionStorage.length; i++) {
                const k = sessionStorage.key(i)
                if (k && k.startsWith('profiles_')) keysToRemove.push(k)
            }
            keysToRemove.forEach(k => sessionStorage.removeItem(k))
        } catch (e) { }

        try {
            const email = localStorage.getItem("user_email")
            if (!email) return

            const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }

            await fetch('/api/interactions', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: email,
                    targetId: currentProfile.id,
                    action: 'pass'
                })
            })
        } catch (error) {
            console.error(`Failed to pass user:`, error)
        }
    }, [profiles, isAnimating, handleLikeIntent, getAuthHeaders])

    const handleTeamSwipe = useCallback((direction: "left" | "right") => {
        if (discoverableTeams.length === 0 || isAnimating) return
        const currentTeam = discoverableTeams[discoverableTeams.length - 1]

        if (direction === "right") {
            setTeamTarget(currentTeam)
        } else {
            setIsAnimating(true)
            setExitDirection("left")
            setTimeout(() => {
                setAllTeams(prev => prev.filter(t => t.id !== currentTeam.id))
                setExitDirection(null)
                setIsAnimating(false)
            }, 350)
            // Clear cache so skipped team doesn't reappear on next load
            const userId = localStorage.getItem("user_email")
            if (userId) {
                try { sessionStorage.removeItem(`teams_discover_${userId}`) } catch (e) { }
            }
        }
    }, [discoverableTeams, isAnimating])


    const handleSwipeWrapper = (direction: "left" | "right") => {
        if (mode === 'people') handleSwipe(direction)
        else if (mode === 'teams') handleTeamSwipe(direction)
    }

    const handleStar = useCallback(() => {
        handleLikeIntent("star")
    }, [handleLikeIntent])

    // PERF: Only show the blocking spinner on the VERY FIRST load (before any mode is loaded).
    // After that, mode switches show stale data instantly while refreshing in background.
    if ((loading || contextLoading) && loadedModes.size === 0) return <div className="flex h-full items-center justify-center">Loading...</div>

    return (
        <div className="relative h-full w-full max-w-[calc(100%-24px)] md:max-w-sm mx-auto my-3 md:my-0 overflow-hidden rounded-2xl">

            {/* Header: Toggle (centered) + Count (right, only in Teams mode) Overlay */}
            <div className="absolute top-6 left-0 right-0 px-4 z-50 flex items-center gap-2 pointer-events-none">

                {/* Toggle — fills available space, scales to card width */}
                <div className="flex-1 pointer-events-auto">
                    <DiscoveryToggle mode={mode} onChange={(m) => setMode(m as any)} />
                </div>

                {/* Member Count — right side, only in Teams mode */}
                {mode === 'teams' && discoverableTeams.length > 0 && (() => {
                    const currentTeam = discoverableTeams[discoverableTeams.length - 1]
                    return (
                        <div className="pointer-events-auto shrink-0">
                            <button
                                onClick={() => setIsMembersModalOpen(true)}
                                className="bg-background/80 backdrop-blur-md border rounded-full px-2 py-1.5 flex items-center gap-1.5 shadow-sm hover:bg-background transition-all active:scale-95 text-[10px] font-medium"
                            >
                                <Users className="h-3 w-3 text-primary" />
                                <span>{currentTeam?.member_count || 1}</span>
                            </button>
                        </div>
                    )
                })()}
            </div>

            {/* Content Area — Full Height Cards background */}
            <div className="absolute inset-0 z-10">
                {mode === 'my-teams' ? (
                    <div className="absolute inset-0 pt-28 px-4 overflow-y-auto pb-24 bg-background/50 backdrop-blur-sm z-40 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold">My Teams</h2>
                            <Button
                                size="sm"
                                className="rounded-full shadow-sm bg-primary text-white hover:bg-primary/90 h-8 px-4 text-xs"
                                onClick={() => setIsCreateTeamOpen(true)}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Create
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {myTeams.length > 0 ? (
                                myTeams.map((team) => {
                                    const isAdmin = team.creator?.id === currentUserId ||
                                        team.members?.some((m: any) => m.user?.id === currentUserId && ['admin', 'Leader', 'creator'].includes(m.role))
                                    return (
                                        <div key={team.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-muted/30 transition-colors shadow-sm gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-sm mb-1 truncate">{team.title}</h3>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                                                    {/* Member count pill — clickable for all users */}
                                                    <button
                                                        onClick={() => setMyTeamsMembersTarget(team)}
                                                        className="flex items-center gap-1 hover:text-primary transition-colors active:scale-95"
                                                    >
                                                        <Users className="h-3 w-3" />
                                                        <span className="underline underline-offset-2">{Math.max(team.member_count || 0, 1)} members</span>
                                                    </button>
                                                    <span className={`px-1.5 py-0.5 rounded-full border ${team.status === 'open' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                                        {team.status === 'open' ? 'Recruiting' : 'Closed'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Manage button — only for admin/creator */}
                                            {isAdmin && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs shrink-0"
                                                    onClick={() => router.push(`/main/teams/${team.id}/dashboard`)}
                                                >
                                                    Manage
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Briefcase className="h-8 w-8 mx-auto opacity-20 mb-3" />
                                    <p className="text-sm mb-2">No teams created yet.</p>
                                    <Button variant="link" size="sm" onClick={() => setIsCreateTeamOpen(true)}>
                                        Create your first team
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Swipe Decks */
                    <AnimatePresence mode="popLayout">
                        {mode === 'people' ? (
                            profiles.length > 0 ? (
                                [...profiles].map((profile, index) => {
                                    const isTop = index === profiles.length - 1
                                    return (
                                        <SwipeCard
                                            key={profile.id}
                                            profile={profile}
                                            onSwipe={handleSwipeWrapper}
                                            onClick={() => !isAnimating && setSelectedProfile(profile)}
                                            style={{ zIndex: index }}
                                            exitDirection={isTop ? exitDirection : null}
                                        />
                                    )
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-20">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 bg-muted/50 rounded-full mb-4 shadow-inner"
                                    >
                                        <RefreshCcw className="h-8 w-8 animate-spin-slow" />
                                    </motion.div>
                                    <p className="text-sm">No more profiles nearby.</p>
                                    <Button variant="link" size="sm" onClick={() => window.location.reload()}>Refresh List</Button>
                                </div>
                            )
                        ) : ( // mode === 'teams'
                            discoverableTeams.length > 0 ? (
                                [...discoverableTeams].map((team, index) => {
                                    const isTop = index === discoverableTeams.length - 1
                                    return (
                                        <TeamCard
                                            key={team.id}
                                            team={team}
                                            onSwipe={handleSwipeWrapper}
                                            style={{ zIndex: index }}
                                            exitDirection={isTop ? exitDirection : null}
                                        />
                                    )
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-20">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 bg-muted/50 rounded-full mb-4 shadow-inner"
                                    >
                                        <Briefcase className="h-8 w-8 opacity-40" />
                                    </motion.div>
                                    <p className="text-sm">No active teams recruiting.</p>
                                    <Button variant="link" size="sm" onClick={() => setIsCreateTeamOpen(true)}>Create a Team</Button>
                                </div>
                            )
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer / Action Buttons (Only for Swipe Modes) */}
            {mode !== 'my-teams' && (
                <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center items-center gap-6 pointer-events-none">
                    <div className="pointer-events-auto flex gap-4 items-center">
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-12 w-12 rounded-full border-2 border-red-500/10 text-red-500 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 shadow-md bg-background transition-all active:scale-90"
                            onClick={() => handleSwipeWrapper("left")}
                            disabled={isAnimating || !!messageTarget || !!teamTarget || activeDeck.length === 0}
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        {mode === 'people' && (
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full border-2 border-sky-500/10 text-sky-500 hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-500/30 shadow-sm bg-background transition-all active:scale-90"
                                onClick={handleStar}
                                disabled={isAnimating || !!messageTarget || activeDeck.length === 0}
                            >
                                <Star className="h-4 w-4 fill-current" />
                            </Button>
                        )}

                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-md border-none transition-all active:scale-95 flex items-center justify-center"
                            onClick={() => handleSwipeWrapper("right")}
                            disabled={isAnimating || !!messageTarget || !!teamTarget || activeDeck.length === 0}
                        >
                            <Check className="h-6 w-6" strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {selectedProfile && (
                    <ProfileDetailModal
                        profile={selectedProfile}
                        onClose={() => setSelectedProfile(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {messageTarget && (
                    <ConnectionMessageModal
                        profile={messageTarget}
                        onConfirm={handleSendWithMessage}
                        onCancel={handleCancelMessage}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {teamTarget && (
                    <TeamApplicationModal
                        team={teamTarget}
                        onConfirm={handleApplyToTeam}
                        onCancel={handleCancelMessage}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCreateTeamOpen && (
                    <CreateTeamModal
                        isOpen={isCreateTeamOpen}
                        onClose={() => setIsCreateTeamOpen(false)}
                        onSuccess={(newTeam) => setAllTeams(prev => [...prev, newTeam])}
                    />
                )}
            </AnimatePresence>

            {/* TeamMembersModal — used from Discover teams view */}
            <TeamMembersModal
                isOpen={isMembersModalOpen}
                onClose={() => setIsMembersModalOpen(false)}
                members={mode === 'teams' && discoverableTeams.length > 0 ? discoverableTeams[discoverableTeams.length - 1]?.members : []}
                creator={mode === 'teams' && discoverableTeams.length > 0 ? discoverableTeams[discoverableTeams.length - 1]?.creator : null}
                teamName={mode === 'teams' && discoverableTeams.length > 0 ? discoverableTeams[discoverableTeams.length - 1]?.title : 'Team'}
                onMemberClick={(member) => {
                    const profile = mapRowToProfile(member.user)
                    setSelectedProfile(profile)
                    setIsMembersModalOpen(false)
                }}
                onCreatorClick={(creator) => {
                    const profile = mapRowToProfile(creator)
                    setSelectedProfile(profile)
                    setIsMembersModalOpen(false)
                }}
                onChat={(() => {
                    if (mode !== 'teams' || discoverableTeams.length === 0) return undefined
                    const currentTeam = discoverableTeams[discoverableTeams.length - 1]
                    const myEmail = localStorage.getItem("user_email")
                    const isCreator = currentTeam.creator?.id === myEmail
                    const isMember = currentTeam.members?.some((m: any) => m.user?.id === myEmail)
                    if (isCreator || isMember) {
                        return () => {
                            selectConversation(`team_${currentTeam.id}`, null, 'group')
                            router.push('/main/chat')
                        }
                    }
                    return undefined
                })()}
            />

            {/* TeamMembersModal — used from My Teams list (any user can view members) */}
            {myTeamsMembersTarget && (
                <TeamMembersModal
                    isOpen={!!myTeamsMembersTarget}
                    onClose={() => setMyTeamsMembersTarget(null)}
                    members={myTeamsMembersTarget?.members || []}
                    creator={myTeamsMembersTarget?.creator || null}
                    teamName={myTeamsMembersTarget?.title || 'Team'}
                    onMemberClick={(member) => {
                        const profile = mapRowToProfile(member.user)
                        setSelectedProfile(profile)
                        setMyTeamsMembersTarget(null)
                    }}
                    onCreatorClick={(creator) => {
                        const profile = mapRowToProfile(creator)
                        setSelectedProfile(profile)
                        setMyTeamsMembersTarget(null)
                    }}
                    onChat={(() => {
                        if (!myTeamsMembersTarget) return undefined
                        const myEmail = localStorage.getItem("user_email")
                        const isCreator = myTeamsMembersTarget.creator?.id === myEmail
                        const isMember = myTeamsMembersTarget.members?.some((m: any) => m.user?.id === myEmail)
                        if (isCreator || isMember) {
                            return () => {
                                selectConversation(`team_${myTeamsMembersTarget.id}`, null, 'group')
                                router.push('/main/chat')
                                setMyTeamsMembersTarget(null)
                            }
                        }
                        return undefined
                    })()}
                />
            )}




        </div >
    )
}
