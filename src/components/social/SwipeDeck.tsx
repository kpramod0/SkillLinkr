"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Star, RefreshCcw, Briefcase, Plus } from "lucide-react"
import { SwipeCard } from "./SwipeCard"
import { UserProfile } from "@/types"
import { Button } from "@/components/ui/button"
import { ProfileDetailModal } from "./ProfileDetailModal"
import { ConnectionMessageModal } from "./ConnectionMessageModal"
import { useDiscovery } from "@/context/DiscoveryContext"
import { DiscoveryToggle } from "./DiscoveryToggle"
import { TeamCard } from "./TeamCard"
import { CreateTeamModal } from "./CreateTeamModal"
import { TeamApplicationModal } from "./TeamApplicationModal"
import { TeamMembersModal } from "./TeamMembersModal"
import { Users } from "lucide-react"
import { mapRowToProfile } from "@/lib/profileUtils"
import { useRouter } from "next/navigation"
import { useChat } from "@/context/ChatContext"
import { MyTeamsModal } from "./MyTeamsModal"
import { createClient } from "@supabase/supabase-js"

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

    const [loading, setLoading] = useState(true)
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

    // Fetch profiles from API
    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true)
            try {
                const email = localStorage.getItem("user_email")
                const res = await fetch('/api/profiles')
                if (!res.ok) throw new Error('Failed to fetch profiles')
                const data: UserProfile[] = await res.json()

                let filtered = data

                if (email) {
                    const matchRes = await fetch(`/api/matches?userId=${email}`)
                    let matchedIds = new Set<string>();
                    if (matchRes.ok) {
                        const matches: UserProfile[] = await matchRes.json()
                        matches.forEach(m => matchedIds.add(m.id))
                    }

                    filtered = filtered.filter(p =>
                        p.id !== email &&
                        !blockedIds.has(p.id) &&
                        !matchedIds.has(p.id)
                    )
                }

                if (filters.genders && filters.genders.length > 0 && !filters.genders.includes('Any')) {
                    filtered = filtered.filter(p => filters.genders.includes(p.personal.gender))
                }

                if (filters.years && filters.years.length > 0) {
                    filtered = filtered.filter(p => filters.years.includes(p.professionalDetails.year))
                }

                if (filters.domains && filters.domains.length > 0) {
                    filtered = filtered.filter(p => {
                        return p.professionalDetails?.domains?.some(domain =>
                            filters.domains.includes(domain)
                        )
                    })
                }

                if (filters.skills && filters.skills.length > 0) {
                    const lowercaseFilters = filters.skills.map(s => s.toLowerCase())
                    filtered = filtered.filter(p => {
                        const profileSkills = p.professionalDetails?.skills?.map(s => s.name.toLowerCase()) || []
                        return profileSkills.some(s => lowercaseFilters.includes(s))
                    })
                }

                if (filters.openTo && filters.openTo.length > 0) {
                    filtered = filtered.filter(p => {
                        const profileOpenTo = p.professionalDetails?.openTo || []
                        return profileOpenTo.some(badge => filters.openTo.includes(badge))
                    })
                }

                setProfiles(filtered)
            } catch (error) {
                console.error("Error fetching swipe profiles:", error)
            } finally {
                setLoading(false)
            }
        }

        const fetchTeams = async () => {
            setLoading(true)
            try {
                const email = localStorage.getItem("user_email")
                const filter = mode === 'my-teams' ? 'mine' : 'discover';
                const url = email ? `/api/teams?userId=${email}&filter=${filter}` : '/api/teams'

                const headers = await getAuthHeaders()
                const res = await fetch(url, { headers: headers as HeadersInit })

                if (!res.ok) throw new Error('Failed to fetch teams')
                const data = await res.json()
                setAllTeams(data)
            } catch (error) {
                console.error("Error fetching teams:", error)
            } finally {
                setLoading(false)
            }
        }

        if (!contextLoading) {
            if (mode === 'people') fetchProfiles()
            else fetchTeams() // Fetch for both 'teams' and 'my-teams', URL logic handles difference
        }

        // Fetch Current User Email — prioritize localStorage (consistent with rest of app)
        const getUser = async () => {
            const localEmail = localStorage.getItem("user_email")
            if (localEmail) {
                setCurrentUserId(localEmail)
            } else {
                // Fallback to Supabase auth
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.email) setCurrentUserId(user.email)
            }
        }
        getUser()
    }, [filters, contextLoading, mode, getAuthHeaders])

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

        // IMPORTANT: no await here
        getAuthHeaders()
            .then((authHeaders) => {
                const headers = { "Content-Type": "application/json", ...authHeaders }

                // NOTE: body should match the new /api/teams/apply route (no applicantId)
                return fetch("/api/teams/apply", {
                    method: "POST",
                    headers: headers as HeadersInit,
                    body: JSON.stringify({ teamId, message, userId }),
                })
            })
            .then(async (res) => {
                if (!res) return // handle void return if fetch fails earlier (though promise chain usually flows)
                if (!res.ok) {
                    console.error("Apply failed:", await res.text())
                    // Optional: re-fetch teams or rollback optimistic UI here
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
                setAllTeams(prev => prev.filter(t => t.id !== currentTeam.id)) // Remove from allTeams
                setExitDirection(null)
                setIsAnimating(false)
            }, 350)
        }
    }, [discoverableTeams, isAnimating])

    const handleSwipeWrapper = (direction: "left" | "right") => {
        if (mode === 'people') handleSwipe(direction)
        else if (mode === 'teams') handleTeamSwipe(direction)
    }

    const handleStar = useCallback(() => {
        handleLikeIntent("star")
    }, [handleLikeIntent])

    if (loading || contextLoading) return <div className="flex h-full items-center justify-center">Loading...</div>

    return (
        <div className="flex flex-col h-full w-full md:max-w-sm mx-auto relative overflow-hidden">

            {/* Header: Toggle | Count */}
            <div className="absolute top-6 left-0 right-0 z-50 flex items-center justify-between px-4 pointer-events-none">

                <div className="w-12 pointer-events-auto">
                    {/* Left spacer or back? */}
                </div>

                {/* Center: Toggle */}
                <div className="flex-shrink-0 pointer-events-auto">
                    <DiscoveryToggle mode={mode} onChange={(m) => setMode(m as any)} />
                </div>

                {/* Right: Member Count (Only for Discover Teams) */}
                <div className="w-12 flex justify-end pointer-events-auto">
                    {mode === 'teams' && discoverableTeams.length > 0 && (
                        <button
                            onClick={() => setIsMembersModalOpen(true)}
                            className="bg-background/80 backdrop-blur-md border rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm hover:bg-background transition-colors text-xs font-medium"
                        >
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>
                                {discoverableTeams[discoverableTeams.length - 1]?.members?.length || 1}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative w-full h-full">
                {mode === 'my-teams' ? (
                    <div className="absolute inset-0 pt-24 px-4 overflow-y-auto pb-20 bg-background/50 backdrop-blur-sm z-40">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">My Teams</h2>
                            <Button
                                size="sm"
                                className="rounded-full shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-4 text-xs"
                                onClick={() => setIsCreateTeamOpen(true)}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Create Team
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {myTeams.length > 0 ? (
                                myTeams.map((team) => (
                                    <div key={team.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-muted/30 transition-colors shadow-sm">
                                        <div>
                                            <h3 className="font-semibold text-base mb-1">{team.title}</h3>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {team.members?.length || 0} Members
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded-full border ${team.status === 'open' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                                    {team.status === 'open' ? 'Recruiting' : 'Closed'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Share logic would go here or reuse MyTeamsModal logic, simplified for now to just Manage */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    router.push(`/main/teams/${team.id}/dashboard`)
                                                }}
                                            >
                                                Manage
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Briefcase className="h-10 w-10 mx-auto opacity-20 mb-3" />
                                    <p className="mb-2">You haven't created any teams.</p>
                                    <Button variant="link" onClick={() => setIsCreateTeamOpen(true)}>
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
                                profiles.map((profile, index) => {
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
                                    <div className="p-4 bg-muted rounded-full mb-4">
                                        <RefreshCcw className="h-8 w-8" />
                                    </div>
                                    <p>No more profiles around you.</p>
                                    <Button variant="link" onClick={() => window.location.reload()}>Refresh</Button>
                                </div>
                            )
                        ) : ( // mode === 'teams'
                            discoverableTeams.length > 0 ? (
                                discoverableTeams.map((team, index) => {
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
                                    <div className="p-4 bg-muted rounded-full mb-4">
                                        <Briefcase className="h-8 w-8" />
                                    </div>
                                    <p>No active teams looking for members.</p>
                                    <Button variant="link" onClick={() => setIsCreateTeamOpen(true)}>Create One?</Button>
                                </div>
                            )
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer / Action Buttons (Only for Swipe Modes) */}
            {mode !== 'my-teams' && (
                <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center items-center gap-6 pointer-events-none">
                    <div className="pointer-events-auto flex gap-4">
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-14 w-14 rounded-full border-2 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/50 shadow-lg bg-background"
                            onClick={() => handleSwipeWrapper("left")}
                            disabled={isAnimating || !!messageTarget || !!teamTarget || activeDeck.length === 0}
                        >
                            <X className="h-6 w-6" />
                        </Button>

                        {mode === 'people' && (
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full border-2 border-sky-500/20 text-sky-500 hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-500/50 shadow-md bg-background mt-2"
                                onClick={handleStar}
                                disabled={isAnimating || !!messageTarget || activeDeck.length === 0}
                            >
                                <Star className="h-5 w-5 fill-current" />
                            </Button>
                        )}

                        <Button
                            size="icon"
                            className="h-14 w-14 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg border-none"
                            onClick={() => handleSwipeWrapper("right")}
                            disabled={isAnimating || !!messageTarget || !!teamTarget || activeDeck.length === 0}
                        >
                            {mode === 'people' ? <Check className="h-6 w-6" strokeWidth={3} /> : <Check className="h-6 w-6" strokeWidth={3} />}
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

            <TeamMembersModal
                isOpen={isMembersModalOpen}
                onClose={() => setIsMembersModalOpen(false)}
                members={mode === 'teams' && discoverableTeams.length > 0 ? discoverableTeams[discoverableTeams.length - 1]?.members : []}
                teamName={mode === 'teams' && discoverableTeams.length > 0 ? discoverableTeams[discoverableTeams.length - 1]?.title : 'Team'}
                onMemberClick={(member) => {
                    // Convert member.user (flat DB row mostly) to UserProfile
                    // We need to ensure we use the 'user' object from the member
                    const profile = mapRowToProfile(member.user)
                    setSelectedProfile(profile)
                    setIsMembersModalOpen(false) // Close the list content modal
                }}
                onChat={(() => {
                    if (mode !== 'teams' || discoverableTeams.length === 0) return undefined

                    const currentTeam = discoverableTeams[discoverableTeams.length - 1]
                    const myEmail = localStorage.getItem("user_email")

                    // Check if I am a member or creator
                    const isCreator = currentTeam.creator?.id === myEmail
                    const isMember = currentTeam.members?.some((m: any) => m.user.id === myEmail)

                    if (isCreator || isMember) {
                        return () => {
                            selectConversation(`team_${currentTeam.id}`, null, 'group')
                            router.push('/main/chat')
                        }
                    }
                    return undefined
                })()}
            />




        </div >
    )
}
