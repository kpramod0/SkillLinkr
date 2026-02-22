"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCheck, Heart, UserCheck, MessageCircle, Users, Award, Info } from "lucide-react"

type Notification = {
    id: string
    type: 'like' | 'match' | 'message' | 'team_invite' | 'achievement' | 'system'
    title: string
    message: string
    link?: string
    is_read: boolean
    created_at: string
    data?: any
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    const fetchNotifications = async () => {
        const userId = localStorage.getItem('user_email')
        if (!userId) return

        try {
            const res = await fetch(`/api/notifications?userId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkRead = async (id: string, link?: string) => {
        const userId = localStorage.getItem('user_email')
        if (!userId) return

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))

        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_read', notificationId: id, userId })
            })
            if (link) router.push(link)
        } catch (error) {
            console.error("Failed to mark read", error)
        }
    }

    const handleMarkAllRead = async () => {
        const userId = localStorage.getItem('user_email')
        if (!userId) return

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_read', notificationId: 'all', userId })
            })
        } catch (error) {
            console.error("Failed to mark all read", error)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-2xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-full">
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-bold">Notifications</h1>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-primary text-sm font-medium flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Mark all
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="max-w-2xl mx-auto pb-20">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 text-2xl">🔔</div>
                        <p>No notifications yet</p>
                        <p className="text-sm mt-1">Your activity will show up here</p>
                    </div>
                ) : (
                    <div className="divide-y border-x border-border/50">
                        {notifications.map(n => {
                            const icon = n.type === 'like' ? <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                                : n.type === 'match' ? <UserCheck className="h-5 w-5 text-emerald-500" />
                                    : n.type === 'message' ? <MessageCircle className="h-5 w-5 text-blue-500" />
                                        : n.type === 'team_invite' ? <Users className="h-5 w-5 text-purple-500" />
                                            : n.type === 'achievement' ? <Award className="h-5 w-5 text-amber-500" />
                                                : <Info className="h-5 w-5 text-muted-foreground" />;

                            const handleNotificationClick = () => {
                                handleMarkRead(n.id, n.link);
                                // Navigate to relevant page based on type
                                if (n.type === 'like') router.push('/main/likes');
                                else if (n.type === 'match') router.push('/main/chat');
                                else if (n.type === 'message') router.push('/main/chat');
                            };

                            return (
                                <div
                                    key={n.id}
                                    onClick={handleNotificationClick}
                                    className={`p-4 flex gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="mt-0.5 shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        {icon}
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-sm leading-tight">{n.title}</h3>
                                            {!n.is_read && <span className="h-2 w-2 bg-primary rounded-full shrink-0" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-snug">{n.message}</p>
                                        <p className="text-xs text-muted-foreground/50 pt-0.5">
                                            {new Date(n.created_at).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
