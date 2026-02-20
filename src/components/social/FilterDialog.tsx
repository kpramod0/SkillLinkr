"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDiscovery } from "@/context/DiscoveryContext"
import { useClickOutside } from "@/hooks/use-click-outside"
import { OpenToBadges } from "@/components/social/OpenToBadges"
import { Plus, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"

export function FilterDialog() {
    const { filters, updateFilters } = useDiscovery()
    const [isOpen, setIsOpen] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)

    // Close dialog when clicking outside
    // Return true to prevent the click action only if the dialog is actually open
    useClickOutside(dialogRef, () => {
        if (isOpen) {
            setIsOpen(false)
            return true // Prevent the click from activating other elements
        }
        return false // Dialog is closed, allow normal clicks
    })

    // Local state for editing before apply
    const [localGenders, setLocalGenders] = useState<string[]>([])
    const [localYears, setLocalYears] = useState<string[]>([])
    const [localDomains, setLocalDomains] = useState<string[]>([])
    const [localSkills, setLocalSkills] = useState<string[]>([])
    const [localOpenTo, setLocalOpenTo] = useState<string[]>([])
    const [skillInput, setSkillInput] = useState("")

    // Sync local state with context when opening
    useEffect(() => {
        if (isOpen) {
            setLocalGenders(filters.genders)
            setLocalYears(filters.years)
            setLocalDomains(filters.domains)
            setLocalSkills(filters.skills || [])
            setLocalOpenTo(filters.openTo || [])
        }
    }, [isOpen, filters])

    const handleApply = () => {
        updateFilters({
            genders: localGenders,
            years: localYears,
            domains: localDomains,
            skills: localSkills,
            openTo: localOpenTo
        })
        setIsOpen(false)
    }

    const handleReset = () => {
        setLocalGenders([])
        setLocalYears([])
        setLocalDomains([])
        setLocalSkills([])
        setLocalOpenTo([])
    }

    const toggleGender = (g: string) => {
        setLocalGenders(prev =>
            prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
        )
    }

    const toggleYear = (y: string) => {
        setLocalYears(prev =>
            prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]
        )
    }

    const toggleDomain = (d: string) => {
        setLocalDomains(prev =>
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
        )
    }

    const addSkill = () => {
        const s = skillInput.trim()
        if (s && !localSkills.includes(s)) {
            setLocalSkills(prev => [...prev, s])
            setSkillInput("")
        }
    }

    const removeSkill = (s: string) => {
        setLocalSkills(prev => prev.filter(x => x !== s))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addSkill()
        }
    }

    const TECH_DOMAINS = [
        'Frontend', 'Backend', 'Full-Stack', 'AI/ML', 'Mobile', 'DevOps', 'Cloud'
    ]

    return (
        <div className="relative">
            <Button
                variant={isOpen ? "outline" : "ghost"}
                size="icon"
                className="rounded-full relative z-[1001]"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
            </Button>

            {/* Backdrop for mobile closing */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[1000] bg-background/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Dropdown/Dialog */}
            <div
                ref={dialogRef}
                className={cn(
                    "fixed lg:absolute inset-x-8 lg:inset-x-auto lg:right-0 top-4 lg:top-12 w-auto lg:w-80 p-6 bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-2xl transition-all duration-200 z-[1002] border border-slate-700 origin-top lg:origin-top-right",
                    isOpen ? "opacity-100 scale-100 translate-y-0 visible" : "opacity-0 scale-95 -translate-y-4 invisible"
                )}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">Discovery Settings</h3>
                    <span onClick={handleReset} className="text-xs text-primary font-medium cursor-pointer hover:underline">Reset</span>
                </div>

                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">

                    {/* Gender */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">I'm looking for</label>
                        <div className="flex gap-2">
                            {['Male', 'Female', 'Any'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => toggleGender(g)}
                                    className={cn(
                                        "flex-1 text-sm border bg-background/50 rounded-lg py-2 transition-colors",
                                        localGenders.includes(g) ? "bg-primary text-white border-primary" : "hover:bg-primary/10 hover:border-primary"
                                    )}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tech Knowledge (Converted to Multi-select chips) */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Tech Domain</label>
                        <div className="flex flex-wrap gap-2">
                            {TECH_DOMAINS.map(d => (
                                <button
                                    key={d}
                                    onClick={() => toggleDomain(d)}
                                    className={cn(
                                        "text-xs border bg-background/50 rounded-lg px-2 py-1.5 transition-colors",
                                        localDomains.includes(d) ? "bg-indigo-500 text-white border-indigo-500" : "hover:bg-indigo-500/10 hover:border-indigo-500 hover:text-indigo-500"
                                    )}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Year */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Year</label>
                        <div className="flex flex-wrap gap-2">
                            {['1st', '2nd', '3rd', '4th', 'Grad'].map(y => (
                                <button
                                    key={y}
                                    onClick={() => toggleYear(y)}
                                    className={cn(
                                        "text-sm border bg-background/50 rounded-lg px-3 py-1.5 transition-colors",
                                        localYears.includes(y) ? "bg-emerald-500 text-white border-emerald-500" : "hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-500"
                                    )}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Open To Badges */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Available For</label>
                        <OpenToBadges
                            selected={localOpenTo}
                            onChange={setLocalOpenTo}
                        />
                    </div>

                    {/* Skills Filter */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Skills (Must have any)</label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="e.g. React"
                                value={skillInput}
                                onChange={e => setSkillInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-9 text-sm"
                            />
                            <Button size="sm" onClick={addSkill} variant="outline" className="px-3" disabled={!skillInput.trim()}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {localSkills.map(skill => (
                                <span key={skill} className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium border border-primary/20 flex items-center gap-1">
                                    {skill}
                                    <button onClick={() => removeSkill(skill)} className="hover:text-red-500">
                                        <XCircle className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            {localSkills.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">No skills added</span>
                            )}
                        </div>
                    </div>

                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                    <Button onClick={handleApply} className="w-full rounded-xl bg-primary text-primary-foreground">
                        Apply Filters ({localGenders.length + localYears.length + localDomains.length + localSkills.length + localOpenTo.length})
                    </Button>
                </div>
            </div>
        </div>
    )
}
