"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "@/context/ThemeContext"
// Import Supabase Client
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const { theme, toggleTheme } = useTheme()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // 1. Supabase Native Login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) throw authError

            // 2. Fetch Profile to check Onboarding Status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', authData.user?.email || '')
                .single()

            // Ideally we shouldn't fail if profile fetch fails, just assume not onboarded or default
            const isOnboarded = profile?.onboarding_completed ?? false

            // 3. Persist simple session indicator for legacy code if needed (optional)
            localStorage.setItem("user_email", email)

            // 4. Redirect
            if (isOnboarded) {
                router.push("/main/discover")
            } else {
                router.push("/onboarding")
            }

        } catch (err: any) {
            setError(err.message || "Login failed")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-background to-background" />

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-all duration-300 text-muted-foreground hover:text-foreground"
                aria-label="Toggle theme"
            >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 glass rounded-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                        Welcome Back
                    </h1>
                    <p className="text-muted-foreground mt-2">Login to your SkillLinkr account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="roll@kiit.ac.in"
                                className="pl-9 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                className="pl-9 pr-10 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                        isLoading={isLoading}
                    >
                        Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">Don't have an account? </span>
                    <Link href="/signup" className="text-foreground font-medium hover:underline">Sign up</Link>
                </div>
            </motion.div>
        </main>
    )
}
