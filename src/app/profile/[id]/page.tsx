"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { User, MapPin, Code, Loader2, Share2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserProfile } from "@/types"

export default function PublicProfilePage() {
    const params = useParams()
    const userId = params.id as string

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/profiles/${userId}`)
                if (!res.ok) throw new Error('Profile not found')
                const data = await res.json()
                setProfile(data)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        if (userId) fetchProfile()
    }, [userId])

    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

    const handleWhatsAppShare = () => {
        if (!profile) return
        const name = `${profile.personal.firstName} ${profile.personal.lastName}`
        const text = `Check out ${name}'s profile on SkillLinkr: ${shareUrl}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl)
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )

    if (error || !profile) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-center p-4">
            <div>
                <User className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
                <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
            </div>
        </div>
    )

    const photo = profile.visuals?.photos?.[0]
    const name = `${profile.personal.firstName} ${profile.personal.lastName}`

    return (
        <div className="min-h-screen bg-background">
            {/* Cover */}
            <div className="h-48 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />

            <div className="max-w-lg mx-auto px-4 pb-24">
                {/* Avatar */}
                <div className="relative -mt-16 mb-4 flex items-end justify-between">
                    <div className="h-32 w-32 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-xl">
                        {photo ? (
                            <img src={photo} alt={name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                                {profile.personal.firstName[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mb-2">
                        <Button size="sm" variant="outline" onClick={handleCopyLink} className="text-xs gap-1">
                            <Share2 className="h-3.5 w-3.5" /> Copy Link
                        </Button>
                        <Button size="sm" onClick={handleWhatsAppShare} className="text-xs gap-1 bg-green-500 hover:bg-green-600 text-white border-none">
                            <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
                        </Button>
                    </div>
                </div>

                {/* Name & Basic Info */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{name}</h1>
                    <p className="text-muted-foreground text-sm">
                        {profile.professionalDetails?.year && `${profile.professionalDetails.year} Year`}
                        {profile.professionalDetails?.domains?.length > 0 && ` • ${profile.professionalDetails.domains.join(', ')}`}
                    </p>
                    {profile.visuals?.bio && (
                        <p className="mt-3 text-sm leading-relaxed">{profile.visuals.bio}</p>
                    )}
                </div>

                {/* Skills */}
                {profile.professionalDetails?.skills?.length > 0 && (
                    <div className="mb-6 bg-card border rounded-xl p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                            <Code className="h-4 w-4" /> Skills
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.professionalDetails.skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
                                    {skill.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Open To */}
                {profile.professionalDetails?.openTo?.length > 0 && (
                    <div className="mb-6 bg-card border rounded-xl p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Open To</h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.professionalDetails.openTo.map((item: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Connect on App */}
                <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">Connect with {profile.personal.firstName} on SkillLinkr</p>
                    <Button
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none px-8"
                        onClick={() => window.open('/login', '_blank')}
                    >
                        Open in App
                    </Button>
                </div>
            </div>
        </div>
    )
}
