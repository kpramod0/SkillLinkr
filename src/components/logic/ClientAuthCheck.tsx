"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function ClientAuthCheck() {
    const router = useRouter()

    useEffect(() => {
        // Check if user is already logged in
        const email = localStorage.getItem("user_email")
        if (email) {
            console.log("Session found, redirecting to main app...")
            router.replace("/main/discover")
        }
    }, [router])

    return null // This component doesn't render anything
}
