"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Users, CheckCircle, Loader2, XCircle, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type JoinState = 'loading' | 'preview' | 'joining' | 'joined' | 'already_member' | 'error' | 'closed'

export default function JoinTeamPage() {
    const params = useParams()
    const router = useRouter()
    const teamId = params.id as string
    const token = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token')

    const [state, setState] = useState<JoinState>('loading')
    const [team, setTeam] = useState<any>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            if (!token) { setState('error'); setErrorMsg('Invalid invite link - missing token'); return }

            // Get current user
            const localEmail = localStorage.getItem('user_email')
            let uid = localEmail
            if (!uid) {
                const { data: { user } } = await supabase.auth.getUser()
                uid = user?.email || null
            }

            if (!uid) {
                // Not logged in - redirect to login with return URL
                router.push(`/login?redirect=/join/team/${teamId}?token=${token}`)
                return
            }
            setUserId(uid)

            // Fetch team details to preview
            const res = await fetch(`/api/teams/${teamId}`)
            if (!res.ok) { setState('error'); setErrorMsg('Team not found or link is invalid'); return }
            const teamData = await res.json()
            setTeam(teamData)
            setState('preview')
        }
        init()
    }, [teamId, token, router])

    const handleJoin = async () => {
        if (!userId || !token) return
        setState('joining')

        const res = await fetch(`/api/teams/${teamId}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, invite_token: token })
        })
        const data = await res.json()

        if (res.ok) {
            setState(data.already_member ? 'already_member' : 'joined')
        } else {
            setState(data.error === 'Team is no longer accepting members' ? 'closed' : 'error')
            setErrorMsg(data.error || 'Failed to join team')
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {state === 'loading' && (
                    <div className="text-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
                        <p className="text-muted-foreground">Verifying invite link...</p>
                    </div>
                )}

                {state === 'preview' && team && (
                    <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
                        <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-end p-6">
                            <div>
                                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">You've been invited to</p>
                                <h1 className="text-2xl font-bold text-white">{team.title}</h1>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {team.description && (
                                <p className="text-sm text-muted-foreground">{team.description}</p>
                            )}
                            {team.event_name && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Event:</span>
                                    <span className="font-medium">{team.event_name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{team.member_count || 0} members</span>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={handleJoin}
                                >
                                    Join Team
                                </Button>
                                <Button variant="outline" onClick={() => router.push('/main/discover')}>
                                    Browse Teams
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {(state === 'joining') && (
                    <div className="text-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
                        <p className="text-muted-foreground">Joining team...</p>
                    </div>
                )}

                {state === 'joined' && (
                    <div className="bg-card border rounded-2xl p-8 text-center shadow-xl space-y-4">
                        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                        <h2 className="text-2xl font-bold">You're in! 🎉</h2>
                        <p className="text-muted-foreground">You've joined <strong>{team?.title}</strong>. Go to the chat to connect with your team.</p>
                        <div className="flex gap-3 justify-center">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => router.push('/main/chats')}>Open Chat</Button>
                            <Button variant="outline" onClick={() => router.push('/main/discover')}>Explore</Button>
                        </div>
                    </div>
                )}

                {state === 'already_member' && (
                    <div className="bg-card border rounded-2xl p-8 text-center shadow-xl space-y-4">
                        <CheckCircle className="h-16 w-16 text-sky-500 mx-auto" />
                        <h2 className="text-2xl font-bold">Already a Member</h2>
                        <p className="text-muted-foreground">You're already part of <strong>{team?.title}</strong>.</p>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => router.push('/main/chats')}>Open Chat</Button>
                    </div>
                )}

                {state === 'closed' && (
                    <div className="bg-card border rounded-2xl p-8 text-center shadow-xl space-y-4">
                        <XCircle className="h-16 w-16 text-amber-500 mx-auto" />
                        <h2 className="text-2xl font-bold">Team is Closed</h2>
                        <p className="text-muted-foreground">This team is no longer accepting new members.</p>
                        <Button variant="outline" onClick={() => router.push('/main/discover')}>Browse Other Teams</Button>
                    </div>
                )}

                {state === 'error' && (
                    <div className="bg-card border rounded-2xl p-8 text-center shadow-xl space-y-4">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                        <h2 className="text-2xl font-bold">Invalid Link</h2>
                        <p className="text-muted-foreground">{errorMsg || 'This invite link is invalid or has expired.'}</p>
                        <Button variant="outline" onClick={() => router.push('/main/discover')}>Go to Discover</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
