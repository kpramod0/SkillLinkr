"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Users, Shield, UserMinus, Trash2, Check, X, Settings, Share2, Loader2, MessageCircle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/context/ToastContext"
import { Team } from "@/components/social/TeamCard"
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal"
import { UserProfile } from "@/types"
import { AnimatePresence } from "framer-motion"

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface TeamMember {
    user_id: string
    role: 'creator' | 'admin' | 'member'
    joined_at: string
    profiles: {
        id: string
        first_name: string
        last_name: string
        email: string
        photos: string[]
        headline: string
    }
}

interface TeamApplication {
    id: string
    created_at: string
    user1_id: string // applicant
    profiles: {
        id: string
        first_name: string
        last_name: string
        photos: string[]
        headline: string
    }
}

export default function TeamDashboard() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const teamId = params.id as string

    const [team, setTeam] = useState<Team | null>(null)
    const [members, setMembers] = useState<TeamMember[]>([])
    const [applications, setApplications] = useState<TeamApplication[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'members' | 'applications' | 'settings'>('members')
    const [currentUserRole, setCurrentUserRole] = useState<'creator' | 'admin' | 'member' | null>(null)
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
    const [loadingProfile, setLoadingProfile] = useState<string | null>(null)

    // Form Data for Settings
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "open" as 'open' | 'closed',
        roles_needed: "",
        skills_required: ""
    })

    // Helper to get auth headers with Bearer token
    const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        return token
            ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            : { 'Content-Type': 'application/json' }
    }, [])

    // Fetch all dashboard data. The app uses EMAIL as the user identifier (not UUID).
    // creator_id and team_members.user_id in the DB store the user's email address.
    const fetchData = useCallback(async () => {
        if (!teamId) return

        setIsLoading(true)
        try {
            // PRIMARY identity = email stored in localStorage (matches what's in DB)
            const currentUserEmail = localStorage.getItem('user_email')

            if (!currentUserEmail) {
                console.warn('[Dashboard] No user_email in localStorage, redirecting to login')
                router.push('/login')
                return
            }
            setUserId(currentUserEmail)

            const authHeaders = await getAuthHeaders()

            // --- Step 1: Fetch team (tries API first, falls back to direct Supabase) ---
            let teamData: any = null
            const teamRes = await fetch(`/api/teams/${teamId}`, { headers: authHeaders })
            if (teamRes.ok) {
                teamData = await teamRes.json()
            } else {
                const errBody = await teamRes.text().catch(() => '')
                console.warn(`[Dashboard] API Team fetch failed (${teamRes.status}): ${errBody}. Falling back to client-side Supabase.`)

                // FALLBACK: Query Supabase directly using client-side SDK
                const { data: fallbackTeam, error: fallbackErr } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('id', teamId)
                    .single()

                if (fallbackErr || !fallbackTeam) {
                    console.error('[Dashboard] Double Failure: Both API and direct Supabase team fetch failed')
                    throw new Error(`Team fetch failed: ${fallbackErr?.message || 'Not found'}`)
                }
                teamData = fallbackTeam
            }

            setTeam(teamData)
            setFormData({
                title: teamData.title || '',
                description: teamData.description || '',
                status: teamData.status || 'open',
                roles_needed: (teamData.roles_needed || []).join(', '),
                skills_required: (teamData.skills_required || []).join(', ')
            })

            // creator_id stores email → direct comparison works
            const isCreator = teamData.creator_id === currentUserEmail

            // --- Step 2: Fetch members (tries API first, falls back to direct Supabase) ---
            let membersData: any[] = []
            const membersRes = await fetch(`/api/teams/${teamId}/members`, { headers: authHeaders })
            if (membersRes.ok) {
                membersData = await membersRes.json()
            } else {
                console.warn(`[Dashboard] Members API failed (${membersRes.status}). Falling back to direct query.`)
                const { data: fallbackMembers, error: memErr } = await supabase
                    .from('team_members')
                    .select('user_id, role, joined_at')
                    .eq('team_id', teamId)

                if (memErr) {
                    console.error('[Dashboard] Members fallback query failed:', memErr)
                }
                membersData = fallbackMembers || []
            }
            setMembers(membersData)

            // team_members.user_id also stores email — direct comparison
            const myMemberRow = membersData.find((m: any) => m.user_id === currentUserEmail)
            const isAdminRole = myMemberRow && ['admin', 'Leader', 'creator'].includes(myMemberRow.role)

            // --- Step 3: Determine role ---
            let resolvedRole: 'admin' | 'member' | null = null
            if (isCreator || isAdminRole) {
                resolvedRole = 'admin'
            } else if (myMemberRow) {
                resolvedRole = 'member'
            }

            // Critical Repair: If I am the creator but NOT in membersData yet, I am still an admin
            if (isCreator && !resolvedRole) {
                resolvedRole = 'admin'
            }

            setCurrentUserRole(resolvedRole)

            // --- Step 4: Fetch applications if admin ---
            if (resolvedRole === 'admin') {
                const appsRes = await fetch(`/api/teams/${teamId}/applications`, { headers: authHeaders })
                if (appsRes.ok) {
                    setApplications(await appsRes.json())
                } else {
                    console.warn('[Dashboard] Applications API failed:', appsRes.status)
                    // If applications API fails, we don't throw an error because team/members might still be valid
                    setApplications([])
                }
            }

        } catch (error: any) {
            console.error('[Dashboard] Critical fetchData error:', error)
            toast({
                title: 'Error Loading Dashboard',
                description: error.message || 'Check your connection and try again.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }, [teamId, router, toast, getAuthHeaders])






    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Handlers
    const handlePromote = async (targetUserId: string) => {
        if (!userId) return
        try {
            const res = await fetch(`/api/teams/${teamId}/members`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, targetUserId, newRole: 'admin' })
            })
            if (!res.ok) throw new Error('Failed to promote')

            toast({ title: "Success", description: "Member promoted to Admin", variant: "success" })
            fetchData() // Refresh
        } catch (error) {
            toast({ title: "Error", description: "Failed to promote member", variant: "destructive" })
        }
    }

    const handleKick = async (targetUserId: string) => {
        if (!userId || !confirm("Are you sure you want to remove this member?")) return
        try {
            const res = await fetch(`/api/teams/${teamId}/members?userId=${userId}&targetUserId=${targetUserId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })
            if (!res.ok) throw new Error('Failed to remove')

            toast({ title: "Success", description: "Member removed", variant: "success" })
            fetchData() // Refresh
        } catch (error) {
            toast({ title: "Error", description: "Failed to remove member", variant: "destructive" })
        }
    }

    const handleApplication = async (action: 'accept' | 'reject', applicantId: string, applicationId: string) => {
        if (!userId) return
        try {
            // Use the application-status route which authorizes via bearer token + application ownership
            // This avoids the isTeamAdmin check which can fail due to email/UUID format mismatches
            const headers = await getAuthHeaders()
            const apiAction = action === 'accept' ? 'approve' : 'reject'

            const res = await fetch(`/api/teams/application-status`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId, applicationId, action: apiAction })
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                console.error('[Dashboard] handleApplication error:', errData)
                throw new Error(errData.error || `Failed to ${action}`)
            }

            toast({
                title: action === 'accept' ? "✅ Accepted!" : "Rejected",
                description: action === 'accept' ? "Applicant has been added to the team. Taking you to chat..." : "Application rejected.",
                variant: action === 'accept' ? 'success' : 'default'
            })

            if (action === 'accept') {
                // Instantly move to chat section
                setTimeout(() => router.push('/main/chat'), 1500)
            } else {
                fetchData()
            }
        } catch (error: any) {
            console.error('[Dashboard] handleApplication threw:', error)
            toast({ title: "Error", description: error.message || `Failed to ${action} application`, variant: "destructive" })
        }
    }

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return

        try {
            const res = await fetch(`/api/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    ...formData,
                    roles_needed: formData.roles_needed.split(',').map(s => s.trim()).filter(Boolean),
                    skills_required: formData.skills_required.split(',').map(s => s.trim()).filter(Boolean)
                })
            })
            if (!res.ok) throw new Error('Failed to update')

            toast({ title: "Success", description: "Team settings updated", variant: "success" })
            fetchData()
        } catch (error) {
            toast({ title: "Error", description: "Failed to update team settings", variant: "destructive" })
        }
    }

    const handleMemberClick = async (memberEmail: string) => {
        if (loadingProfile) return
        setLoadingProfile(memberEmail)
        try {
            const res = await fetch(`/api/profile?email=${encodeURIComponent(memberEmail)}`)
            if (res.ok) {
                const profileData = await res.json()
                setSelectedProfile(profileData)
            } else {
                toast({ title: "Error", description: "Could not load profile", variant: "destructive" })
            }
        } catch (error) {
            console.error('Error fetching member profile:', error)
            toast({ title: "Error", description: "Failed to load profile", variant: "destructive" })
        } finally {
            setLoadingProfile(null)
        }
    }


    const handleShare = async () => {
        if (!team || !userId) return
        try {
            // Fetch invite token from API
            const res = await fetch(`/api/teams/${teamId}/invite?userId=${encodeURIComponent(userId)}`, {
                headers: { 'Content-Type': 'application/json' }
            })
            if (!res.ok) {
                toast({ title: "Error", description: "Could not generate invite link", variant: "destructive" })
                return
            }
            const { invite_token, team_title } = await res.json()
            const origin = window.location.origin
            const inviteUrl = `${origin}/join/team/${teamId}?token=${invite_token}`
            const shareText = `🚀 Join my team *${team_title}* on SkillLinkr!\n\nClick the link to join directly:\n${inviteUrl}`

            // Try Web Share API first (mobile)
            if (navigator.share) {
                await navigator.share({ title: `Join ${team_title}`, text: shareText, url: inviteUrl })
            } else {
                // Fallback: offer WhatsApp or copy
                const action = window.confirm(`Share via WhatsApp? (Cancel to copy link)`);
                if (action) {
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
                } else {
                    await navigator.clipboard.writeText(inviteUrl)
                    toast({ title: "✅ Invite Link Copied!", description: "Share this link with anyone to let them join directly." })
                }
            }
        } catch (err) {
            console.error('Share error:', err)
            toast({ title: "Error", description: "Failed to generate invite link", variant: "destructive" })
        }
    }

    if (isLoading) return <div className="p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    if (!currentUserRole) return <div className="p-8 text-center text-muted-foreground">You are not a member of this team or do not have access.</div>

    return (
        <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{team?.title || "Team Dashboard"}</h1>
                            <div className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20 flex items-center gap-1.5">
                                <Users className="h-3 w-3" />
                                {Math.max(members.length, 1)}
                            </div>
                        </div>
                        <p className="text-muted-foreground text-sm">Manage members, roles, and applications.</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Members ({members.length})
                </button>
                <button
                    onClick={() => setActiveTab('applications')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Applications ({applications.length})
                </button>
                {currentUserRole === 'admin' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        Settings
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        <div className="bg-card border rounded-xl overflow-hidden">
                            {members.map((member) => (
                                <div key={member.user_id} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-muted/50 transition-colors">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                                        onClick={() => handleMemberClick(member.user_id)}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden ring-2 ring-transparent group-hover:ring-primary/50 transition-all shrink-0">
                                            {loadingProfile === member.user_id ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                                            ) : member.profiles.photos?.[0] ? (
                                                <img src={member.profiles.photos[0]} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                member.profiles.first_name[0]
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold group-hover:text-primary transition-colors">{member.profiles.first_name} {member.profiles.last_name}</span>
                                                {['admin', 'Leader', 'creator'].includes(member.role) && (
                                                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 text-[10px] font-bold rounded-full border border-yellow-200 uppercase">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{member.profiles.headline || "Member"}</p>
                                        </div>
                                    </div>

                                    {/* Actions (Only Admin can see) */}
                                    {currentUserRole === 'admin' && member.user_id !== userId && (
                                        <div className="flex items-center gap-2">
                                            {member.role !== 'admin' && (
                                                <Button size="sm" variant="outline" onClick={() => handlePromote(member.user_id)}>
                                                    <Shield className="h-4 w-4 mr-1" /> Promote
                                                </Button>
                                            )}
                                            <Button size="sm" variant="destructive" onClick={() => handleKick(member.user_id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'applications' && (
                    <div className="space-y-4">
                        {applications.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No pending applications.</div>
                        ) : (
                            applications.map((app) => (
                                <div key={app.id} className="bg-card border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold overflow-hidden">
                                            {app.profiles.photos?.[0] ? (
                                                <img src={app.profiles.photos[0]} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                app.profiles.first_name[0]
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-semibold">{app.profiles.first_name} {app.profiles.last_name}</span>
                                            <p className="text-sm text-muted-foreground">{app.profiles.headline || "Interested Applicant"}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {currentUserRole === 'admin' && (
                                        <div className="flex items-center gap-2 self-end md:self-center">
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleApplication('reject', app.user1_id, app.id)}>
                                                <X className="h-4 w-4 mr-1" /> Reject
                                            </Button>
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApplication('accept', app.user1_id, app.id)}>
                                                <Check className="h-4 w-4 mr-1" /> Accept
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'settings' && currentUserRole === 'admin' && (
                    <div className="max-w-xl mx-auto">
                        <form onSubmit={handleUpdateTeam} className="space-y-6 bg-card border p-6 rounded-xl shadow-sm">
                            <div className="space-y-2">
                                <Label htmlFor="title">Team Name</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'closed' })}
                                    >
                                        <option value="open">Open (Recruiting)</option>
                                        <option value="closed">Closed (Full)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="roles">Roles Needed (comma separated)</Label>
                                <Input
                                    id="roles"
                                    placeholder="e.g. Frontend Dev, Designer, Marketing"
                                    value={formData.roles_needed}
                                    onChange={(e) => setFormData({ ...formData, roles_needed: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="skills">Skills Required (comma separated)</Label>
                                <Input
                                    id="skills"
                                    placeholder="e.g. React, Node.js, Figma"
                                    value={formData.skills_required}
                                    onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit">
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Profile Detail Modal */}
            <AnimatePresence>
                {selectedProfile && (
                    <ProfileDetailModal
                        profile={selectedProfile}
                        onClose={() => setSelectedProfile(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
