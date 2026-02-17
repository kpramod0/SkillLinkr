"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

export function UpdatePasswordForm() {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            setIsLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setIsLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: password })

            if (error) throw error

            router.push("/login")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-8 glass rounded-2xl"
        >
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">Set New Password</h1>
                <p className="text-muted-foreground mt-2">Enter your new password below</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            className="pl-9 pr-10 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            className="pl-9 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                    isLoading={isLoading}
                >
                    Update Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>
        </motion.div>
    )
}
