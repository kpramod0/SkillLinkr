"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

type Notification = {
    id: string
    type: 'like' | 'message' | 'team_invite' | 'achievement' | 'system'
    title: string
    message: string
    link?: string
    is_read: boolean
    created_at: string
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = async (): Promise<void> => {
        // Ensure we are on client and have a user ID
        if (typeof window === 'undefined') return;

        const userId = localStorage.getItem('user_email');
        if (!userId) {
            // If no user, reset notifications and stop
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        try {
            const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
            if (res.ok) {
                const data: Notification[] = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            } else {
                console.warn("Notification fetch failed:", res.status, res.statusText);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Initial fetch + Polling every 30s
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleMarkRead = async (id: string) => {
        const userId = localStorage.getItem('user_email')
        if (!userId) return

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_read', notificationId: id, userId })
            })
        } catch (error) {
            console.error("Failed to mark read", error)
        }
    }

    const handleMarkAllRead = async () => {
        const userId = localStorage.getItem('user_email')
        if (!userId) return

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)

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

    const handleClick = (n: Notification) => {
        if (!n.is_read) handleMarkRead(n.id)
        if (n.link) {
            router.push(n.link)
            setIsOpen(false)
        }
    }

    const handleBellClick = () => {
        // Mobile: Navigate to page
        if (window.innerWidth < 1024) {
            router.push('/main/notifications')
            return
        }
        // Desktop: Toggle dropdown
        setIsOpen(!isOpen)
    }

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={handleBellClick}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[10px] text-primary hover:underline font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-xs">
                                    No notifications yet
                                </div>
                            ) : (
                                <div>
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleClick(n)}
                                            className={`p-4 border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 ${!n.is_read ? 'bg-primary/5' : ''}`}
                                        >
                                            <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-xs font-semibold leading-none">{n.title}</p>
                                                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/60 pt-1">
                                                    {new Date(n.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
