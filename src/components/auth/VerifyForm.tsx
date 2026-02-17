"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { KeyRound, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Import Supabase Client
import { supabase } from "@/lib/supabase"

export function VerifyForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get("email")

    const [otp, setOtp] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // Use Supabase Native Verification
            const { data, error } = await supabase.auth.verifyOtp({
                email: email || "",
                token: otp,
                type: "signup",
            })

            if (error) throw error

            // Check if user session is established
            if (data.session) {
                // Auto-login successful
                localStorage.setItem("user_email", email || "")
                router.push("/onboarding")
            } else {
                throw new Error("Verification successful, but session not created. Please login.")
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!email) {
        return (
            <div className="text-center text-red-500">
                Invalid session. Please sign up again.
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md p-8 glass rounded-2xl"
        >
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">Verify Email</h1>
                <p className="text-muted-foreground mt-2">
                    We sent a code to <span className="font-medium text-foreground">{email}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Enter 6-digit code"
                            className="pl-9 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10 text-center tracking-widest text-lg"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            required
                        />
                    </div>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-red-500 text-sm text-center"
                    >
                        {error}
                    </motion.p>
                )}

                <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
                    isLoading={isLoading}
                >
                    Verify
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={() => router.back()}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    Wrong email? Go back
                </button>
            </div>
        </motion.div>
    )
}
