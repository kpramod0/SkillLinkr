"use client"

import { useState, useEffect } from "react"
import { UserProfile, Domain, PortfolioProject } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/imageUtils"
import { Save, User, Briefcase, Globe, Heart, Edit2, Check, X, Camera, Trash2, FolderGit2, Plus, ExternalLink, Upload, ChevronDown, ChevronUp, Star, Sparkles } from "lucide-react"
import { SkillSelector } from "./SkillSelector"
import { OpenToBadges } from "@/components/social/OpenToBadges"

interface ProfileEditorProps {
    email: string
}

const DOMAINS: Domain[] = [
    'Frontend', 'Backend', 'Full-Stack', 'Mobile', 'DevOps', 'AI/ML', 'Data Engineering', 'Cybersecurity', 'Cloud', 'Game Dev', 'IoT', 'QA'
]

type Section = 'personal' | 'professional' | 'socials' | 'portfolio' | 'preferences' | null

/**
 * ProfileEditor Component
 * 
 * A comprehensive form for users to edit their profile details.
 * Sections:
 * 1. Personal Details (Name, Age, Year)
 * 2. Professional Details (Skills, Domains, Open To)
 * 3. Socials & Bio (Links, About me)
 * 4. Portfolio (Projects showcase)
 * 5. Preferences (Matching criteria)
 * 
 * Includes image uploading/compression and data persistence.
 */
export function ProfileEditor({ email }: ProfileEditorProps) {
    // --- UI State ---
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [editingSection, setEditingSection] = useState<Section>(null) // Which section is currently expanding for edit
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // --- Form Data State ---
    // Initialized with empty defaults, populated via useEffect
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        personal: {
            firstName: "",
            lastName: "",
            gender: "Other",
            age: 18,
        },
        professionalDetails: {
            year: "1st",
            domains: [],
            skills: [],
            openTo: [],
            languages: [],
        },
        visuals: {
            photos: [],
            bio: "",
        },
        portfolio: [],
        preferences: {
            interestedIn: [],
            interestedDomains: [],
        },
    })

    // --- Temporary Input State ---
    // Used for adding items to lists (languages, contributions) before committing to formData
    const [languageInput, setLanguageInput] = useState("")
    const [contributionInput, setContributionInput] = useState("")
    const [uploadingScreenshot, setUploadingScreenshot] = useState(false)

    // --- Effect: Fetch Profile ---
    // Loads existing user data when component mounts or email changes
    useEffect(() => {
        const fetchProfile = async () => {
            if (!email) return
            try {
                // Fetch profile data from API
                const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`)
                if (res.ok) {
                    const data = await res.json()
                    // If profile exists, populate form state
                    if (data && data.personal) {
                        setFormData(data)
                    }
                }
            } catch (e) {
                console.error("Failed to fetch profile", e)
            }
        }
        fetchProfile()
    }, [email])

    // --- Handbook: Photo Upload ---
    // Handles compressing and uploading user avatar images
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingPhoto(true)
        try {
            // 1. Client-side compression to save bandwidth/storage
            const compressed = await compressImage(file)

            // 2. Prepare FormData for API
            const fd = new FormData()
            fd.append('file', compressed)
            fd.append('userId', email)

            // 3. Send to upload API
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (res.ok) {
                const data = await res.json()
                // 4. Update local state with new image URL
                setFormData(prev => ({
                    ...prev,
                    visuals: {
                        ...prev.visuals!,
                        photos: [...(prev.visuals?.photos || []), data.url]
                    }
                }))
            }
        } catch (err) {
            console.error('Upload failed:', err)
        } finally {
            setUploadingPhoto(false)
        }
    }

    // --- Handler: Photo Delete ---
    // Removes a photo from both storage (via API) and local state
    const handlePhotoDelete = async (url: string) => {
        try {
            await fetch('/api/upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, userId: email })
            })

            // Update UI to remove the deleted photo
            setFormData(prev => ({
                ...prev,
                visuals: {
                    ...prev.visuals!,
                    photos: (prev.visuals?.photos || []).filter(p => p !== url)
                }
            }))
        } catch (err) {
            console.error('Delete failed:', err)
        }
    }

    // --- Helper: Universal Change Handlers ---
    // Update nested state objects (personal, professionalDetails, etc.)
    const handlePersonalChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, personal: { ...prev.personal!, [field]: value } }))
    }

    const handleProfessionalChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, professionalDetails: { ...prev.professionalDetails!, [field]: value } }))
    }

    // --- Helper: Domain Toggling ---
    // Adds or removes a domain (e.g., "Frontend") from the list
    const toggleDomain = (domain: Domain) => {
        const current = formData.professionalDetails?.domains || []
        const updated = current.includes(domain)
            ? current.filter(d => d !== domain) // Remove if exists
            : [...current, domain]              // Add if new
        handleProfessionalChange('domains', updated)
    }

    // --- Helper: Language/Tool Management ---
    // Adds a new language tag from input
    const addLanguage = () => {
        if (!languageInput.trim()) return
        const current = formData.professionalDetails?.languages || []
        // Prevent duplicates
        if (!current.includes(languageInput.trim())) {
            handleProfessionalChange('languages', [...current, languageInput.trim()])
        }
        setLanguageInput("") // Reset input
    }

    const removeLanguage = (lang: string) => {
        const current = formData.professionalDetails?.languages || []
        handleProfessionalChange('languages', current.filter(l => l !== lang))
    }

    // --- Helper: Preference Toggling ---
    // Updates "Interested In" (Gender preference)
    const toggleInterest = (gender: 'Male' | 'Female' | 'Other') => {
        const current = formData.preferences?.interestedIn || []
        const updated = current.includes(gender)
            ? current.filter(g => g !== gender)
            : [...current, gender]
        setFormData(prev => ({ ...prev, preferences: { ...prev.preferences!, interestedIn: updated } }))
    }

    // Updates "Interested Domains" (Tech stack preference)
    const toggleInterestedDomain = (domain: Domain) => {
        const current = formData.preferences?.interestedDomains || []
        const updated = current.includes(domain)
            ? current.filter(d => d !== domain)
            : [...current, domain]
        setFormData(prev => ({ ...prev, preferences: { ...prev.preferences!, interestedDomains: updated } }))
    }

    // --- Handler: Portfolio Management ---
    // Tracks which project is currently expanded for editing
    const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null)

    // Adds a new empty project (max 5)
    const addProject = () => {
        const projects = formData.portfolio || []
        if (projects.length >= 5) return
        const newProject: PortfolioProject = { projectTitle: '' }
        setFormData(prev => ({ ...prev, portfolio: [...(prev.portfolio || []), newProject] }))
        // Auto-expand the new project
        setEditingProjectIndex(projects.length)
    }

    const removeProject = (index: number) => {
        setFormData(prev => ({
            ...prev,
            portfolio: (prev.portfolio || []).filter((_, i) => i !== index)
        }))
        // Close expand if deleted
        if (editingProjectIndex === index) setEditingProjectIndex(null)
    }

    // Generic updater for project fields
    const updateProject = (index: number, field: keyof PortfolioProject, value: any) => {
        setFormData(prev => {
            const projects = [...(prev.portfolio || [])]
            projects[index] = { ...projects[index], [field]: value }
            return { ...prev, portfolio: projects }
        })
    }

    // --- Handler: Project Contributions ---
    // Adds a bullet point to "Key Contributions"
    const addContribution = (projectIndex: number) => {
        if (!contributionInput.trim()) return
        const project = (formData.portfolio || [])[projectIndex]
        const current = project?.topContributions || []
        if (current.length >= 5) return
        updateProject(projectIndex, 'topContributions', [...current, contributionInput.trim()])
        setContributionInput("")
    }

    const removeContribution = (projectIndex: number, contribIndex: number) => {
        const project = (formData.portfolio || [])[projectIndex]
        const current = project?.topContributions || []
        updateProject(projectIndex, 'topContributions', current.filter((_, i) => i !== contribIndex))
    }

    // --- Handler: Project Screenshot ---
    // Uploads a screenshot specifically for a portfolio project
    const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectIndex: number) => {
        const file = e.target.files?.[0]
        if (!file) return
        const project = (formData.portfolio || [])[projectIndex]

        // Prevent overwriting without explicit removal
        if (project?.projectScreenshot) {
            alert('Remove existing screenshot first')
            return
        }

        setUploadingScreenshot(true)
        try {
            const compressed = await compressImage(file)
            const fd = new FormData()
            fd.append('file', compressed)
            fd.append('userId', email)
            fd.append('type', 'project-screenshot') // Tag as screenshot

            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (res.ok) {
                const data = await res.json()
                updateProject(projectIndex, 'projectScreenshot', data.url)
            }
        } catch (err) {
            console.error('Screenshot upload failed:', err)
        } finally {
            setUploadingScreenshot(false)
            e.target.value = ''
        }
    }

    const removeScreenshot = (projectIndex: number) => {
        updateProject(projectIndex, 'projectScreenshot', undefined)
    }

    // --- Handler: Save Profile ---
    // Persists all changes to the database
    const handleSave = async () => {
        setIsSaving(true)
        setSuccessMessage("")
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Payload includes email and sets onboarding as complete
                body: JSON.stringify({ email, ...formData, onboardingCompleted: true })
            })

            if (!res.ok) throw new Error("Failed to save profile")

            setSuccessMessage("Changes saved successfully!")
            // Hide message after 3s
            setTimeout(() => setSuccessMessage(""), 3000)
            setEditingSection(null) // Exit edit mode on save
        } catch (error) {
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    // --- Helper Component: Section Header ---
    // Renders the title bar for each section with "Edit" or "Close" button
    const SectionHeader = ({ title, icon: Icon, section }: { title: string, icon: any, section: Section }) => (
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-4">
            <div className="flex items-center gap-2">
                <Icon className="text-emerald-500 h-5 w-5" />
                <h2 className="text-xl font-bold">{title}</h2>
            </div>
            {editingSection === section ? (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => setEditingSection(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <Button size="sm" variant="ghost" className="h-8 px-2 text-primary gap-1" onClick={() => setEditingSection(section)}>
                    <Edit2 className="h-3 w-3" />
                    <span className="text-xs">Edit</span>
                </Button>
            )}
        </div>
    )

    return (
        <div className="space-y-8 max-w-2xl mx-auto pb-24">

            {/* --- Section 0: Feedback / Review --- */}
            {/* Direct link to Google Form for user feedback */}
            <section className="glass p-6 rounded-2xl flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                <div>
                    <h3 className="font-bold flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        Rate Your Experience
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Help us improve quality!</p>
                </div>
                <Button
                    size="sm"
                    onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSdd4k-UWkqXggXFYjbAMg0kdnpOG-Nq1co1gqkNPlisrhatKQ/viewform?usp=dialog', '_blank')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                    Review
                </Button>
            </section>

            {/* --- Section 1: Personal Info --- */}
            <section className="glass p-6 rounded-2xl space-y-4">
                <SectionHeader title="Personal Details" icon={User} section="personal" />

                {editingSection === 'personal' ? (
                    // --- Edit Mode: Personal ---
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">First Name</label>
                                <Input
                                    value={formData.personal?.firstName}
                                    onChange={e => handlePersonalChange('firstName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Last Name</label>
                                <Input
                                    value={formData.personal?.lastName}
                                    onChange={e => handlePersonalChange('lastName', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Gender</label>
                                <select
                                    className="bg-background flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background"
                                    value={formData.personal?.gender}
                                    onChange={e => handlePersonalChange('gender', e.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Age</label>
                                <Input
                                    type="number"
                                    value={formData.personal?.age}
                                    onChange={e => handlePersonalChange('age', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Academic Year</label>
                            <div className="flex flex-wrap gap-2">
                                {['1st', '2nd', '3rd', '4th', 'Graduated'].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => handleProfessionalChange('year', y)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm border transition-all",
                                            formData.professionalDetails?.year === y
                                                ? "bg-emerald-500 text-white border-emerald-500"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-1 block">Branch / Department</label>
                            <Input
                                placeholder="e.g. CSE, IT, ECE, Mechanical..."
                                value={formData.personal?.branch || ''}
                                onChange={e => handlePersonalChange('branch', e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    // --- View Mode: Personal ---
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase">Full Name</span>
                            <span className="font-semibold">{formData.personal?.firstName} {formData.personal?.lastName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase">Gender / Age</span>
                            <span className="font-semibold">{formData.personal?.gender}, {formData.personal?.age}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase">Year</span>
                            <span className="font-semibold">{formData.professionalDetails?.year}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase">Branch</span>
                            <span className="font-semibold">{formData.personal?.branch || <span className="text-muted-foreground italic text-sm">Not set</span>}</span>
                        </div>
                    </div>
                )}
            </section>

            {/* --- Section 2: Professional & Skills --- */}
            <section className="glass p-6 rounded-2xl space-y-6">
                <SectionHeader title="Skills & Education" icon={Briefcase} section="professional" />

                {editingSection === 'professional' ? (
                    // --- Edit Mode: Professional ---
                    <>
                        {/* Domain Selection (Pills) */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">Tech Domains</label>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINS.map(domain => (
                                    <button
                                        key={domain}
                                        onClick={() => toggleDomain(domain)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                            formData.professionalDetails?.domains?.includes(domain)
                                                ? "bg-indigo-500 text-white border-indigo-500"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        {domain}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Top Skills Selector */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block flex items-center gap-2">
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                Top Skills
                            </label>
                            <SkillSelector
                                selectedSkills={formData.professionalDetails?.skills || []}
                                onChange={(skills) => handleProfessionalChange('skills', skills)}
                            />
                        </div>

                        {/* Open To Badges */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-purple-500" />
                                Open To
                            </label>
                            <OpenToBadges
                                selected={formData.professionalDetails?.openTo || []}
                                onChange={(badges) => handleProfessionalChange('openTo', badges)}
                            />
                        </div>

                        {/* Languages / Tools Input */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">Languages / Tools (Classic)</label>
                            <div className="flex gap-2 mb-3">
                                <Input
                                    placeholder="Add skill (e.g. React, Python)"
                                    value={languageInput}
                                    onChange={e => setLanguageInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addLanguage()}
                                />
                                <Button onClick={addLanguage} variant="outline">Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.professionalDetails?.languages?.map(lang => (
                                    <span key={lang} className="bg-muted px-3 py-1 rounded-md text-sm flex items-center gap-2 border">
                                        {lang}
                                        <button onClick={() => removeLanguage(lang)} className="hover:text-red-500">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    // --- View Mode: Professional ---
                    <div className="space-y-5">
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase mb-2">Domains</span>
                            <div className="flex flex-wrap gap-2">
                                {formData.professionalDetails?.domains?.map(d => (
                                    <span key={d} className="bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-full text-xs font-medium border border-indigo-500/20">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <span className="text-muted-foreground block text-xs uppercase mb-2">Top Skills</span>
                            <div className="flex flex-wrap gap-2">
                                {formData.professionalDetails?.skills?.map(s => (
                                    <span key={s.name} className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md text-xs font-semibold border border-amber-500/20 flex items-center gap-1">
                                        {s.name}
                                        <span className="flex text-amber-500">
                                            {[...Array(s.level)].map((_, i) => <Star key={i} className="h-2 w-2 fill-current" />)}
                                        </span>
                                    </span>
                                ))}
                                {(!formData.professionalDetails?.skills || formData.professionalDetails.skills.length === 0) && (
                                    <span className="text-xs text-muted-foreground italic">No skills added</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="text-muted-foreground block text-xs uppercase mb-2">Open To</span>
                            <OpenToBadges
                                selected={formData.professionalDetails?.openTo || []}
                                readonly
                            />
                        </div>

                        <div>
                            <span className="text-muted-foreground block text-xs uppercase mb-2">Other Languages</span>
                            <div className="flex flex-wrap gap-2">
                                {formData.professionalDetails?.languages?.map(l => (
                                    <span key={l} className="bg-muted px-2 py-1 rounded text-xs border">
                                        {l}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* --- Section 3: Socials & Bio --- */}
            <section className="glass p-6 rounded-2xl space-y-4">
                <SectionHeader title="Socials & Bio" icon={Globe} section="socials" />

                {editingSection === 'socials' ? (
                    // --- Edit Mode: Socials ---
                    <>
                        <div className="grid grid-cols-1 gap-4">
                            <Input
                                placeholder="GitHub URL"
                                value={formData.visuals?.github || ""}
                                onChange={e => setFormData(p => ({ ...p, visuals: { ...p.visuals!, github: e.target.value } }))}
                            />
                            <Input
                                placeholder="LinkedIn URL"
                                value={formData.visuals?.linkedin || ""}
                                onChange={e => setFormData(p => ({ ...p, visuals: { ...p.visuals!, linkedin: e.target.value } }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">Bio</label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Tell everyone about yourself..."
                                value={formData.visuals?.bio || ""}
                                onChange={e => setFormData(p => ({ ...p, visuals: { ...p.visuals!, bio: e.target.value } }))}
                            />
                        </div>
                    </>
                ) : (
                    // --- View Mode: Socials ---
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2 text-sm">
                            {formData.visuals?.github && (
                                <a href={formData.visuals.github} target="_blank" className="text-primary hover:underline block truncate">
                                    Github: {formData.visuals.github}
                                </a>
                            )}
                            {formData.visuals?.linkedin && (
                                <a href={formData.visuals.linkedin} target="_blank" className="text-primary hover:underline block truncate">
                                    LinkedIn: {formData.visuals.linkedin}
                                </a>
                            )}
                            {!formData.visuals?.github && !formData.visuals?.linkedin && (
                                <p className="text-muted-foreground italic">No links added.</p>
                            )}
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase mb-1">Bio</span>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {formData.visuals?.bio || "No bio yet."}
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {/* --- Section 4: Portfolio / Project Showcase --- */}
            <section className="glass p-6 rounded-2xl space-y-4">
                <SectionHeader title={`Project Showcase (${(formData.portfolio || []).length}/5)`} icon={FolderGit2} section="portfolio" />

                {editingSection === 'portfolio' ? (
                    // --- Edit Mode: Portfolio ---
                    <div className="space-y-4">
                        {(formData.portfolio || []).map((project, pIdx) => (
                            <div key={pIdx} className="border border-white/10 rounded-xl p-4 space-y-3 bg-muted/20">
                                {/* Project Header within List */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-primary">Project {pIdx + 1}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingProjectIndex(editingProjectIndex === pIdx ? null : pIdx)} className="text-muted-foreground hover:text-primary transition-colors">
                                            {editingProjectIndex === pIdx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                        <button onClick={() => removeProject(pIdx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Always show title input for quick access */}
                                <Input
                                    placeholder="Project Title *"
                                    value={project.projectTitle || ""}
                                    onChange={e => updateProject(pIdx, 'projectTitle', e.target.value)}
                                />

                                {/* Expanded details: Description, Links, Screenshot, Contributions */}
                                {editingProjectIndex === pIdx && (
                                    <div className="space-y-3">
                                        <textarea
                                            className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            placeholder="Briefly describe your project..."
                                            value={project.projectDescription || ""}
                                            onChange={e => updateProject(pIdx, 'projectDescription', e.target.value)}
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Project Link"
                                                value={project.projectLink || ""}
                                                onChange={e => updateProject(pIdx, 'projectLink', e.target.value)}
                                            />
                                            <Input
                                                placeholder="GitHub Repo Link"
                                                value={project.githubRepoLink || ""}
                                                onChange={e => updateProject(pIdx, 'githubRepoLink', e.target.value)}
                                            />
                                        </div>

                                        {/* Screenshot (1 per project) */}
                                        <div>
                                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">Screenshot</label>
                                            {project.projectScreenshot ? (
                                                <div className="relative w-44 h-28 rounded-lg overflow-hidden border bg-muted group">
                                                    <img src={project.projectScreenshot} alt="Screenshot" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeScreenshot(pIdx)}
                                                        className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-44 h-28 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                                                    {uploadingScreenshot ? (
                                                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                                                    ) : (
                                                        <>
                                                            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                                                            <span className="text-xs text-muted-foreground">Add Screenshot</span>
                                                        </>
                                                    )}
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleScreenshotUpload(e, pIdx)} disabled={uploadingScreenshot} />
                                                </label>
                                            )}
                                        </div>

                                        {/* Contributions List */}
                                        <div>
                                            <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                                                Key Contributions ({project.topContributions?.length || 0}/5)
                                            </label>
                                            <div className="flex gap-2 mb-2">
                                                <Input
                                                    placeholder="e.g. Built the recommendation engine"
                                                    value={contributionInput}
                                                    onChange={e => setContributionInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addContribution(pIdx)}
                                                />
                                                <Button onClick={() => addContribution(pIdx)} variant="outline" size="icon" className="shrink-0">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {project.topContributions?.map((c, ci) => (
                                                    <div key={ci} className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border text-sm">
                                                        <span className="text-emerald-500 font-bold">•</span>
                                                        <span className="flex-1">{c}</span>
                                                        <button onClick={() => removeContribution(pIdx, ci)} className="text-muted-foreground hover:text-red-500">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {(formData.portfolio || []).length < 5 && (
                            <Button onClick={addProject} variant="outline" className="w-full border-dashed gap-2">
                                <Plus className="h-4 w-4" /> Add Project ({(formData.portfolio || []).length}/5)
                            </Button>
                        )}
                    </div>
                ) : (
                    // --- View Mode: Portfolio ---
                    <div className="space-y-3">
                        {(formData.portfolio || []).length > 0 ? (
                            (formData.portfolio || []).map((project, pIdx) => (
                                <div key={pIdx} className="border border-white/10 rounded-xl p-4 space-y-2 bg-muted/10">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">{project.projectTitle || `Project ${pIdx + 1}`}</span>
                                    </div>
                                    {project.projectDescription && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">{project.projectDescription}</p>
                                    )}
                                    {project.projectScreenshot && (
                                        <img src={project.projectScreenshot} alt="Screenshot" className="w-40 h-28 object-cover rounded-lg border" />
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {project.projectLink && (
                                            <a href={project.projectLink} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-md border border-primary/20">
                                                <ExternalLink className="h-3 w-3" /> Live
                                            </a>
                                        )}
                                        {project.githubRepoLink && (
                                            <a href={project.githubRepoLink} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-md border border-primary/20">
                                                <FolderGit2 className="h-3 w-3" /> GitHub
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground italic text-sm">No projects added. Click Edit to showcase your work!</p>
                        )}
                    </div>
                )}
            </section>

            {/* --- Section 5: Preferences --- */}
            <section className="glass p-6 rounded-2xl space-y-4">
                <SectionHeader title="Preferences" icon={Heart} section="preferences" />

                {editingSection === 'preferences' ? (
                    // --- Edit Mode: Preferences ---
                    <>
                        {/* Gender Preference */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-3 block">Interested In (Gender)</label>
                            <div className="flex gap-4">
                                {(['Male', 'Female', 'Other'] as const).map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleInterest(option)}
                                        className={cn(
                                            "flex-1 p-3 rounded-xl border-2 transition-all font-medium text-sm text-center",
                                            formData.preferences?.interestedIn?.includes(option)
                                                ? "border-rose-500 bg-rose-500/10 text-rose-500"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Domain Preference */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-bold mb-3 block mt-6">Interested In (Tech Stack)</label>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINS.map(domain => (
                                    <button
                                        key={domain}
                                        onClick={() => toggleInterestedDomain(domain)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                            formData.preferences?.interestedDomains?.includes(domain)
                                                ? "bg-rose-500 text-white border-rose-500"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        {domain}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    // --- View Mode: Preferences ---
                    <div className="space-y-4">
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase mb-2">Looking For</span>
                            <div className="flex gap-2">
                                {formData.preferences?.interestedIn?.map(g => (
                                    <span key={g} className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full text-sm font-medium border border-rose-500/20">
                                        {g}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {formData.preferences?.interestedDomains && formData.preferences.interestedDomains.length > 0 && (
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase mb-2">Tech Interests</span>
                                <div className="flex flex-wrap gap-2">
                                    {formData.preferences?.interestedDomains?.map(d => (
                                        <span key={d} className="bg-rose-500/10 text-rose-500 px-2 py-1 rounded-full text-xs font-medium border border-rose-500/20">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Save Button */}
            {editingSection && (
                <div className="sticky bottom-6 flex justify-center pb-4 z-40">
                    <div className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-2xl border border-primary/20">
                        <Button
                            size="lg"
                            className="px-8 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:scale-105 transition-transform"
                            onClick={handleSave}
                            isLoading={isSaving}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save & Close Editor
                        </Button>
                    </div>
                </div>
            )}

            {successMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 text-white rounded-full backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
                    {successMessage}
                </div>
            )}
        </div>
    )
}
