"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Calendar, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CreateTeamModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (team: any) => void
}

import { supabase } from "@/lib/supabase"

const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)

    // Form State
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [eventName, setEventName] = useState("")
    const [roleInput, setRoleInput] = useState("")
    const [roles, setRoles] = useState<string[]>([])
    const [skillInput, setSkillInput] = useState("")
    const [skills, setSkills] = useState<string[]>([])

    const addRole = () => {
        if (roleInput.trim() && !roles.includes(roleInput.trim())) {
            setRoles([...roles, roleInput.trim()])
            setRoleInput("")
        }
    }

    const addSkill = () => {
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()])
            setSkillInput("")
        }
    }

    const removeRole = (r: string) => setRoles(roles.filter(x => x !== r))
    const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s))

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const { data } = await supabase.auth.getSession()
            const session = data.session

            let userEmail = session?.user?.email

            // Fallback for custom auth flow
            if (!userEmail) {
                const localEmail = localStorage.getItem("user_email")
                if (localEmail) {
                    userEmail = localEmail
                }
            }

            if (!userEmail) {
                console.error("User not authenticated")
                alert("You need to be logged in to create a team.")
                return
            }

            console.log("Creating team with user Email:", userEmail)

            const headers = {
                "Content-Type": "application/json",
                ...(await getAuthHeaders()),
            }

            const res = await fetch("/api/teams", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    creatorId: userEmail,
                    title,
                    description,
                    eventName,
                    rolesNeeded: roles,
                    skillsRequired: skills,
                }),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Failed to create team")
            }

            const team = await res.json()
            console.log("Team created successfully:", team)

            // Optimistic update structure
            const newTeam = {
                ...team,
                creator: { id: userEmail }
            }

            onSuccess(newTeam)
            onClose()
            // Reset form
            setTitle(""); setDescription(""); setEventName(""); setRoles([]); setSkills([]); setStep(1)
        } catch (error) {
            console.error("Failed to create team:", error)
            alert("Failed to create team. Please try again.")
        } finally {
            setLoading(false)
        }
    }


    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative bg-background w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border z-50 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <div>
                        <h2 className="text-xl font-bold">Create Team</h2>
                        <p className="text-xs text-muted-foreground">Recruit members for your next project</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Project / Team Title</Label>
                            <Input
                                placeholder="e.g. Smart India Hackathon Team"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="What are you building? What is the goal?"
                                className="min-h-[100px]"
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" /> Event Name (Optional)
                            </Label>
                            <Input
                                placeholder="e.g. SIH 2026"
                                value={eventName}
                                onChange={e => setEventName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Roles & Skills */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Roles Needed</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. Frontend Dev"
                                    value={roleInput}
                                    onChange={e => setRoleInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addRole()}
                                />
                                <Button size="icon" variant="outline" onClick={addRole}><Plus className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {roles.map(r => (
                                    <span key={r} className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                        {r}
                                        <button onClick={() => removeRole(r)}><X className="h-3 w-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Skills Required</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. React"
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                                />
                                <Button size="icon" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {skills.map(s => (
                                    <span key={s} className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                        {s}
                                        <button onClick={() => removeSkill(s)}><X className="h-3 w-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/20">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !title || !description}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 h-11 text-lg font-bold shadow-lg"
                    >
                        {loading ? 'Creating...' : 'Post Team Card'}
                    </Button>
                </div>

            </motion.div>
        </div>
    )
}
