"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" // Added useRouter import

export function ForgotPasswordForm() {
    const [step, setStep] = useState<"email" | "otp">("email")
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // 1. Check if user exists (Verified Profile)
            const checkRes = await fetch('/api/auth/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const checkData = await checkRes.json()

            if (!checkData.exists) {
                // Mimic success or show error depending on preference. 
                // User explicitly asked to "Don't send OTP", implying we can stop here.
                // We'll show a specific error to the user as requested.
                throw new Error("No account found with this email.")
            }

            // 2. User exists, proceed to send OTP
            const { error } = await supabase.auth.resetPasswordForEmail(email)
            if (error) throw error
            setStep("otp")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        if (password.length < 6) return setError("Password must be at least 6 characters")
        if (password !== confirmPassword) return setError("Passwords do not match")

        try {
            // 1. Verify OTP
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: "recovery",
            })
            if (verifyError) throw verifyError

            // 2. session is now active, update password
            const { error: updateError } = await supabase.auth.updateUser({ password })
            if (updateError) throw updateError

            // 3. Success -> Login
            router.push("/login")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (step === "otp") {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full max-w-md p-8 glass rounded-2xl"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold">Verify & Reset</h2>
                    <p className="text-muted-foreground mt-2">
                        Enter the code sent to {email} and your new password.
                    </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Enter 8-digit Code"
                            value={otp}
                            maxLength={8}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2 relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                        isLoading={isLoading}
                    >
                        Update Password
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setStep("email")}
                    >
                        Back
                    </Button>
                </form>
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
                    Enter your email to receive a recovery code.
                </p>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
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

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    isLoading={isLoading}
                >
                    Send Recovery Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>
        </motion.div>
    )
}
