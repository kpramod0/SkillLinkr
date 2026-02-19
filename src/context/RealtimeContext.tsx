"use client"

import {
    createContext, useContext, useEffect, useState,
    useCallback, useRef, ReactNode
} from "react"
import { createClient, RealtimeChannel } from "@supabase/supabase-js"
import { useAuth } from "./AuthContext"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BadgeCounts {
    likes: number
    chats: number
}

interface RealtimeContextType {
    badges: BadgeCounts
    clearLikesBadge: () => void
    clearChatsBadge: () => void
    /** Subscribe to receive new like/match events in real-time (for the likes page) */
    onNewLike: (cb: (payload: any) => void) => () => void
    onNewMatch: (cb: (payload: any) => void) => () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { userId } = useAuth()
    const [badges, setBadges] = useState<BadgeCounts>({ likes: 0, chats: 0 })

    // Listener sets for broadcasting events to page-level subscribers
    const likeListenersRef = useRef<Set<(p: any) => void>>(new Set())
    const matchListenersRef = useRef<Set<(p: any) => void>>(new Set())

    // Realtime channel refs
    const likesChannelRef = useRef<RealtimeChannel | null>(null)
    const matchesChannelRef = useRef<RealtimeChannel | null>(null)
    const teamAppsChannelRef = useRef<RealtimeChannel | null>(null)

    // --- Subscribe to likes / matches / team_applications ---
    useEffect(() => {
        if (!userId) return

        // Cleanup old subscriptions
        if (likesChannelRef.current) supabase.removeChannel(likesChannelRef.current)
        if (matchesChannelRef.current) supabase.removeChannel(matchesChannelRef.current)
        if (teamAppsChannelRef.current) supabase.removeChannel(teamAppsChannelRef.current)

        // 1. New likes where I am the target (someone liked me)
        likesChannelRef.current = supabase
            .channel(`likes_for_${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "likes",
                    filter: `liked_id=eq.${userId}`
                },
                (payload) => {
                    // Update badge
                    setBadges(prev => ({ ...prev, likes: prev.likes + 1 }))
                    // Notify likes page subscribers
                    likeListenersRef.current.forEach(cb => cb(payload.new))
                }
            )
            .subscribe()

        // 2. New matches (either position)
        matchesChannelRef.current = supabase
            .channel(`matches_for_${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "matches",
                    filter: `user1_id=eq.${userId}`
                },
                (payload) => {
                    setBadges(prev => ({ ...prev, chats: prev.chats + 1 }))
                    matchListenersRef.current.forEach(cb => cb(payload.new))
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "matches",
                    filter: `user2_id=eq.${userId}`
                },
                (payload) => {
                    setBadges(prev => ({ ...prev, chats: prev.chats + 1 }))
                    matchListenersRef.current.forEach(cb => cb(payload.new))
                }
            )
            .subscribe()

        return () => {
            if (likesChannelRef.current) supabase.removeChannel(likesChannelRef.current)
            if (matchesChannelRef.current) supabase.removeChannel(matchesChannelRef.current)
            if (teamAppsChannelRef.current) supabase.removeChannel(teamAppsChannelRef.current)
        }
    }, [userId])

    // --- Initial badge fetch (only once on load) ---
    useEffect(() => {
        if (!userId) return
        const fetchInitial = async () => {
            try {
                const likesSeen = localStorage.getItem('likes_last_seen') || ''
                const chatsSeen = localStorage.getItem('chats_last_seen') || ''
                const params = new URLSearchParams({ userId })
                if (likesSeen) params.set('likesSeen', likesSeen)
                if (chatsSeen) params.set('chatsSeen', chatsSeen)
                const res = await fetch(`/api/counts?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setBadges({ likes: data.likes || 0, chats: data.chats || 0 })
                }
            } catch { /* silent */ }
        }
        fetchInitial()
    }, [userId])

    // --- Public API ---

    const clearLikesBadge = useCallback(() => {
        localStorage.setItem('likes_last_seen', new Date().toISOString())
        setBadges(prev => ({ ...prev, likes: 0 }))
    }, [])

    const clearChatsBadge = useCallback(() => {
        localStorage.setItem('chats_last_seen', new Date().toISOString())
        setBadges(prev => ({ ...prev, chats: 0 }))
    }, [])

    const onNewLike = useCallback((cb: (p: any) => void) => {
        likeListenersRef.current.add(cb)
        return () => likeListenersRef.current.delete(cb)
    }, [])

    const onNewMatch = useCallback((cb: (p: any) => void) => {
        matchListenersRef.current.add(cb)
        return () => matchListenersRef.current.delete(cb)
    }, [])

    return (
        <RealtimeContext.Provider value={{ badges, clearLikesBadge, clearChatsBadge, onNewLike, onNewMatch }}>
            {children}
        </RealtimeContext.Provider>
    )
}

export function useRealtime() {
    const ctx = useContext(RealtimeContext)
    if (!ctx) throw new Error("useRealtime must be used within <RealtimeProvider>")
    return ctx
}
