"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
import { createClient, Session, User } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AuthContextType {
    session: Session | null
    user: User | null
    userId: string | null   // email or user.id — primary identifier used throughout the app
    isLoading: boolean
    getAuthHeaders: () => Record<string, string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 1. Load existing session immediately (from local cache — zero network cost)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setIsLoading(false)
        })

        // 2. Keep session in sync with any auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setIsLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    // Synchronous — returns immediately from cached session (no async needed)
    const getAuthHeaders = useCallback((): Record<string, string> => {
        const token = session?.access_token
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [session])

    // userId: prefer email (consistent with how the app stores user identity)
    const userId = session?.user?.email || session?.user?.id || null
    const user = session?.user ?? null

    return (
        <AuthContext.Provider value={{ session, user, userId, isLoading, getAuthHeaders }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
    return ctx
}
