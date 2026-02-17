"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // 1. Supabase handles "user not found" security by sending a fake success message (to prevent enumeration)
            // or we can let it fail silently.
            // But for a better UX, we just proceed to send the email.

            // 2. Send Reset Email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
            })

            if (error) throw error

            setIsSent(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (isSent) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 glass rounded-2xl text-center"
            >
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                <p className="text-muted-foreground mb-6">
                    We have sent a password reset link to <span className="text-foreground font-medium">{email}</span>
                </p>
                <Link href="/login">
                    <Button variant="outline" className="w-full">
                        Back to Login
                    </Button>
                </Link>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-8 glass rounded-2xl"
        >
            <div className="text-center mb-8">
                <Link
                    href="/login"
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                </Link>
                <h1 className="text-2xl font-bold">Reset Password</h1>
                <p className="text-muted-foreground mt-2">
                    Enter your email to receive recovery instructions
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            className="pl-9 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    isLoading={isLoading}
                >
                    Send Reset Link
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>
        </motion.div>
    )
}
