"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { User, Code2, Camera, Heart, ChevronRight, ChevronLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/imageUtils"
import { Domain, UserProfile } from "@/types"

interface WizardProps {
    email: string
}

const steps = [
    { id: 1, title: "About You", icon: User },
    { id: 2, title: "Tech Stack", icon: Code2 },
    { id: 3, title: "Profile", icon: Camera },
    { id: 4, title: "Preferences", icon: Heart },
]

const DOMAINS: Domain[] = [
    'Frontend', 'Backend', 'Full-Stack', 'Mobile', 'DevOps', 'AI/ML', 'Data Engineering', 'Cybersecurity', 'Cloud', 'Game Dev', 'IoT', 'QA'
]

export function OnboardingWizard({ email }: WizardProps) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // Fetch existing profile if modifying
    useEffect(() => {
        const fetchProfile = async () => {
            if (!email) return
            try {
                const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`)
                if (res.ok) {
                    const data = await res.json()
                    // If profile exists, merge it into state
                    if (data && data.personal) {
                        setFormData(data)
                        // If we are editing (onboardingCompleted is true), we might want to start at step 1 but allowing flexible navigation
                        // For now, let's just prefill.
                    }
                }
            } catch (e) {
                console.error("Failed to fetch profile", e)
            }
        }
        fetchProfile()
    }, [email])

    // Form State
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        personal: {
            firstName: "",
            lastName: "",
            gender: "Other",
            age: 18,
            year: "1st",
        },
        professional: {
            domains: [],
            languages: [],
        },
        visuals: {
            photos: [],
            bio: "",
        },
        preferences: {
            interestedIn: [],
        },
    })

    // State specific helpers for array inputs
    const [languageInput, setLanguageInput] = useState("")

    const handlePersonalChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, personal: { ...prev.personal!, [field]: value } }))
    }

    const toggleDomain = (domain: Domain) => {
        const current = formData.professional?.domains || []
        const updated = current.includes(domain)
            ? current.filter(d => d !== domain)
            : [...current, domain]
        setFormData(prev => ({ ...prev, professional: { ...prev.professional!, domains: updated } }))
    }

    const addLanguage = () => {
        if (!languageInput.trim()) return
        const current = formData.professional?.languages || []
        if (!current.includes(languageInput.trim())) {
            setFormData(prev => ({ ...prev, professional: { ...prev.professional!, languages: [...current, languageInput.trim()] } }))
        }
        setLanguageInput("")
    }

    const toggleInterest = (gender: 'Male' | 'Female' | 'Other') => {
        const current = formData.preferences?.interestedIn || []
        const updated = current.includes(gender)
            ? current.filter(g => g !== gender)
            : [...current, gender]
        setFormData(prev => ({ ...prev, preferences: { ...prev.preferences!, interestedIn: updated } }))
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, ...formData })
            })

            if (!res.ok) throw new Error("Failed to save profile")

            router.push('/main/discover')
        } catch (error) {
            console.error(error)
            // Show error handling UI technically
        } finally {
            setIsLoading(false)
        }
    }

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(c => c + 1)
        else handleSubmit()
    }

    return (
        <div className="glass rounded-2xl p-8 w-full">
            {/* Progress Bar */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 rounded-full" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                />
                {steps.map((step) => {
                    const Icon = step.icon
                    const isActive = step.id <= currentStep
                    return (
                        <div key={step.id} className={cn("flex flex-col items-center gap-2 bg-background p-2 rounded-full border-2 transition-colors", isActive ? "border-primary text-primary" : "border-muted text-muted-foreground")}>
                            <Icon className="h-5 w-5" />
                        </div>
                    )
                })}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="min-h-[300px]"
                >
                    {/* Step 1: Personal */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">Tell us about yourself</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="First Name"
                                    value={formData.personal?.firstName || ""}
                                    onChange={e => handlePersonalChange('firstName', e.target.value)}
                                />
                                <Input
                                    placeholder="Last Name"
                                    value={formData.personal?.lastName || ""}
                                    onChange={e => handlePersonalChange('lastName', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={formData.personal?.gender || "Other"}
                                    onChange={e => handlePersonalChange('gender', e.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <Input
                                    type="number"
                                    placeholder="Age"
                                    value={formData.personal?.age || ""}
                                    onChange={e => handlePersonalChange('age', parseInt(e.target.value))}
                                />
                            </div>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={formData.personal?.year || "1st"}
                                onChange={e => handlePersonalChange('year', e.target.value)}
                            >
                                <option value="1st">1st Year</option>
                                <option value="2nd">2nd Year</option>
                                <option value="3rd">3rd Year</option>
                                <option value="4th">4th Year</option>
                                <option value="Graduated">Graduated / Alumni</option>
                            </select>
                        </div>
                    )}

                    {/* Step 2: Tech Stack */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">What is your expertise?</h2>

                            <div>
                                <label className="text-sm text-muted-foreground mb-2 block">Domains (Select all that apply)</label>
                                <div className="flex flex-wrap gap-2">
                                    {DOMAINS.map(domain => (
                                        <button
                                            key={domain}
                                            onClick={() => toggleDomain(domain)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm border transition-all",
                                                formData.professional?.domains?.includes(domain)
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "border-input hover:bg-muted"
                                            )}
                                        >
                                            {domain}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-muted-foreground mb-2 block">Languages / Tools</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add java, python, react..."
                                        value={languageInput}
                                        onChange={e => setLanguageInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addLanguage()}
                                    />
                                    <Button type="button" onClick={addLanguage} variant="outline">Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.professional?.languages?.map(lang => (
                                        <span key={lang} className="bg-muted px-2 py-1 rounded text-sm flex items-center gap-1">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Profile */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">Your Digital Presence</h2>
                            <Input
                                placeholder="GitHub Profile URL (Optional)"
                                value={formData.visuals?.github || ""}
                                onChange={e => setFormData(p => ({ ...p, visuals: { ...p.visuals!, github: e.target.value } }))}
                            />
                            <Input
                                placeholder="LinkedIn Profile URL (Optional)"
                                value={formData.visuals?.linkedin || ""}
                                onChange={e => setFormData(p => ({ ...p, visuals: { ...p.visuals!, linkedin: e.target.value } }))}
                            />
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Short bio about yourself..."
                                value={formData.visuals?.bio || ""}
                                onChange={e => setFormData(p => ({ ...p, visuals: { ...p.visuals!, bio: e.target.value } }))}
                            />
                            <div className="space-y-3">
                                <label className="text-sm text-muted-foreground block">Profile Photo</label>
                                <div className="flex justify-center">
                                    {(formData.visuals?.photos || []).length > 0 ? (
                                        <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-input group">
                                            <img src={formData.visuals!.photos[0]} alt="Profile" className="w-full h-full object-cover" />
                                            <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <Camera className="h-6 w-6 text-white mb-1" />
                                                <span className="text-xs text-white">Change</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={uploadingPhoto}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setUploadingPhoto(true);
                                                        try {
                                                            // Delete old photo first
                                                            const oldUrl = formData.visuals?.photos?.[0];
                                                            if (oldUrl) {
                                                                await fetch('/api/upload', {
                                                                    method: 'DELETE',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ userId: email, photoUrl: oldUrl })
                                                                });
                                                            }
                                                            // Compress & upload new
                                                            const compressed = await compressImage(file);
                                                            const fd = new FormData();
                                                            fd.append('file', compressed);
                                                            fd.append('userId', email);
                                                            const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                setFormData(p => ({ ...p, visuals: { ...p.visuals!, photos: data.photos } }));
                                                            }
                                                        } catch (err) {
                                                            console.error('Upload failed:', err);
                                                        } finally {
                                                            setUploadingPhoto(false);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className="w-40 h-40 rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
                                            <Camera className="h-8 w-8 mb-2 opacity-50" />
                                            <span className="text-xs text-muted-foreground">
                                                {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploadingPhoto}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploadingPhoto(true);
                                                    try {
                                                        const compressed = await compressImage(file);
                                                        const fd = new FormData();
                                                        fd.append('file', compressed);
                                                        fd.append('userId', email);
                                                        const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                                        if (res.ok) {
                                                            const data = await res.json();
                                                            setFormData(p => ({ ...p, visuals: { ...p.visuals!, photos: data.photos } }));
                                                        }
                                                    } catch (err) {
                                                        console.error('Upload failed:', err);
                                                    } finally {
                                                        setUploadingPhoto(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Preferences */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Preferences</h2>
                            <div>
                                <label className="text-sm text-muted-foreground mb-4 block">Who are you interested in connecting with?</label>
                                <div className="flex gap-4">
                                    {(['Male', 'Female', 'Other'] as const).map(option => (
                                        <button
                                            key={option}
                                            onClick={() => toggleInterest(option)}
                                            className={cn(
                                                "flex-1 p-4 rounded-xl border-2 transition-all font-medium",
                                                formData.preferences?.interestedIn?.includes(option)
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-input hover:bg-muted"
                                            )}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-between">
                {currentStep > 1 ? (
                    <Button onClick={() => setCurrentStep(c => c - 1)} size="lg" variant="outline" className="px-8">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                ) : <div />}
                <Button onClick={nextStep} size="lg" className="px-8" isLoading={isLoading}>
                    {currentStep === 4 ? (formData.onboardingCompleted ? "Save Changes" : "Complete Setup") : "Next Step"}
                    {currentStep < 4 && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>

        </div>
    )
}
