"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { UserProfile, Domain } from "@/types"

interface FilterState {
    genders: string[]
    years: string[]
    domains: string[]
    skills: string[]
    openTo: string[]
}

interface DiscoveryContextType {
    filters: FilterState
    updateFilters: (newFilters: FilterState) => void
    isLoading: boolean
    blockedIds: Set<string>
    refreshBlocked: () => void
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined)

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
    const [filters, setFilters] = useState<FilterState>({
        genders: [],
        years: [],
        domains: [],
        skills: [],
        openTo: []
    })
    const [isLoading, setIsLoading] = useState(true)

    const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())

    // Initial Load: No filters by default (user explicitly sets them)
    useEffect(() => {
        const userId = localStorage.getItem("user_email")
        if (userId) {
            fetchBlockedUsers(userId)
        }
        setIsLoading(false)
    }, [])

    const fetchBlockedUsers = async (userId: string) => {
        try {
            const res = await fetch(`/api/user/block?userId=${userId}`)
            if (res.ok) {
                const ids = await res.json()
                setBlockedIds(new Set(ids))
            }
        } catch (error) {
            console.error("Failed to fetch blocked users", error)
        }
    }

    const refreshBlocked = () => {
        const userId = localStorage.getItem("user_email")
        if (userId) fetchBlockedUsers(userId)
    }

    const updateFilters = (newFilters: FilterState) => {
        setFilters(newFilters)
    }

    return (
        <DiscoveryContext.Provider value={{ filters, updateFilters, isLoading, blockedIds, refreshBlocked }}>
            {children}
        </DiscoveryContext.Provider>
    )
}

export function useDiscovery() {
    const context = useContext(DiscoveryContext)
    if (context === undefined) {
        throw new Error("useDiscovery must be used within a DiscoveryProvider")
    }
    return context
}
