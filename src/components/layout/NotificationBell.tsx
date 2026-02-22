"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"

type Notification = {
    id: string
    type: 'like' | 'message' | 'team_invite' | 'achievement' | 'system'
    is_read: boolean
}

interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchNotifications = async (): Promise<void> => {
        if (typeof window === 'undefined') return;

        const userId = localStorage.getItem('user_email');
        if (!userId) {
            setUnreadCount(0);
            return;
        }

        try {
            const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
            if (res.ok) {
                const data: Notification[] = await res.json();
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative shrink-0">
            <Bell className={className || "h-6 w-6"} />
            {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </div>
    )
}
