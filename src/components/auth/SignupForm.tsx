"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight, Eye, EyeOff, GraduationCap, Briefcase, BookOpen, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { compressAvatar } from "@/lib/imageUtils"
// Import Supabase Client
import { supabase } from "@/lib/supabase"

export function SignupForm() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState<"student" | "faculty" | "">("")
    const [branch, setBranch] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [devOtp, setDevOtp] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [compressingPhoto, setCompressingPhoto] = useState(false)
    const photoInputRef = useRef<HTMLInputElement>(null)

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        // Show instant preview from original file
        const reader = new FileReader()
        reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
        reader.readAsDataURL(file)

        setCompressingPhoto(true)
        try {
            const compressed = await compressAvatar(file)
            setPhotoFile(compressed)
            // Update preview with the compressed version
            const compReader = new FileReader()
            compReader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
            compReader.readAsDataURL(compressed)
        } catch {
            // Compression failed — use original file
            setPhotoFile(file)
        } finally {
            setCompressingPhoto(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        if (!email.endsWith("@kiit.ac.in")) {
            setError("Please use your @kiit.ac.in email address.")
            setIsLoading(false)
            return
        }

        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.")
            setIsLoading(false)
            return
        }

        if (!role) {
            setError("Please select your role.")
            setIsLoading(false)
            return
        }

        if (role === 'student' && !branch.trim()) {
            setError("Please enter your branch/department.")
            setIsLoading(false)
            return
        }

        try {
            // Check if user already exists
            const { data: existingUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", email)
                .single()

            if (existingUser) {
                setError("User already registered. Please login.")
                setIsLoading(false)
                return
            }

            // Use Supabase Native Auth
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: role, // Stored in raw_user_meta_data
                        branch: role === 'student' ? branch.trim() : null,
                    },
                },
            })

            if (error) throw error

            // Upload photo if selected.
            // We wait 600ms after signUp so the Supabase DB trigger has time to create
            // the profile row before we try to update it with the photo URL.
            if (photoFile && data.user) {
                try {
                    await new Promise(r => setTimeout(r, 600))
                    const fd = new FormData()
                    fd.append('file', photoFile)
                    fd.append('userId', email)
                    await fetch('/api/upload', { method: 'POST', body: fd })
                } catch {
                    // Photo upload failed silently — user can add/update later from their profile
                }
            }

            // Redirect to email verification page
            router.push(`/verify?email=${encodeURIComponent(email)}`)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md p-8 glass rounded-2xl"
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
                    SkillLinkr
                </h1>
                <p className="text-muted-foreground mt-2">Sign in with your university email</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Profile Photo Upload — optional */}
                <div className="flex flex-col items-center gap-2 mb-2">
                    <label
                        className="relative cursor-pointer group"
                        onClick={() => photoInputRef.current?.click()}
                    >
                        <div className={cn(
                            "h-20 w-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200 overflow-hidden",
                            photoPreview
                                ? "border-emerald-500"
                                : "border-white/20 bg-white/5 hover:border-emerald-500/60 hover:bg-white/10"
                        )}>
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : compressingPhoto ? (
                                <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                            ) : (
                                <Camera className="h-7 w-7 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                            )}
                        </div>
                        {/* Camera overlay on hover when photo exists */}
                        {photoPreview && (
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-5 w-5 text-white" />
                            </div>
                        )}
                    </label>
                    <span className="text-xs text-muted-foreground">
                        {compressingPhoto ? "Compressing…" : <>Profile photo <span className="text-muted-foreground/50">(optional)</span></>}
                    </span>
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoSelect}
                    />
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">I am a</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setRole("student")}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium text-sm",
                                role === "student"
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10"
                                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10"
                            )}
                        >
                            <GraduationCap className="h-5 w-5" />
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("faculty")}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium text-sm",
                                role === "faculty"
                                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/10"
                                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10"
                            )}
                        >
                            <Briefcase className="h-5 w-5" />
                            Faculty/Staff
                        </button>
                    </div>
                </div>

                {/* Branch — only for students, required */}
                {role === 'student' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                    >
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Branch / Department (e.g. CSE, IT, ECE)"
                                className="pl-9 bg-white border-gray-200 dark:bg-white/5 dark:border-white/10"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                required
                            />
                        </div>
                    </motion.div>
                )}

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
                            placeholder="Create a password (min 6 chars)"
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
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-red-500 text-sm"
                    >
                        {error}
                    </motion.p>
                )}

                <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
                    isLoading={isLoading}
                >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>

            <div className="mt-6 text-center text-sm space-y-2">
                <div>
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Link href="/login" className="text-foreground font-medium hover:underline">Login</Link>
                </div>
                <p className="text-xs text-muted-foreground">
                    By clicking continue, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </motion.div>
    )
}
