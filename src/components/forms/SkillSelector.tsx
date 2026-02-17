"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Star, Plus } from "lucide-react"
import { Skill } from "@/types"

// Curated list of skills for auto-suggest
const COMMON_SKILLS = [
    "React", "Next.js", "TypeScript", "JavaScript", "Python",
    "Node.js", "Java", "C++", "Flutter", "Firebase",
    "Supabase", "MongoDB", "PostgreSQL", "SQL", "Git",
    "Figma", "UI/UX Design", "Machine Learning", "AI", "Data Science",
    "AWS", "Docker", "Kubernetes", "DevOps", "Cybersecurity",
    "Blockchain", "Web3", "Solidity", "Rust", "Go",
    "Swift", "Kotlin", "Android", "iOS", "React Native",
    "Vue.js", "Angular", "Svelte", "TailwindCSS", "HTML/CSS",
    "Graphic Design", "Video Editing", "Content Writing", "Marketing",
    "Public Speaking", "Project Management", "Leadership", "Research"
]

interface SkillSelectorProps {
    selectedSkills: Skill[]
    onChange: (skills: Skill[]) => void
    maxSkills?: number
}

export function SkillSelector({ selectedSkills, onChange, maxSkills = 10 }: SkillSelectorProps) {
    const [query, setQuery] = useState("")
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Filter suggestions
    const suggestions = query
        ? COMMON_SKILLS.filter(skill =>
            skill.toLowerCase().includes(query.toLowerCase()) &&
            !selectedSkills.some(s => s.name === skill)
        ).slice(0, 5)
        : []

    // Handle clicking outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const addSkill = (name: string, level: 1 | 2 | 3 = 1) => {
        if (selectedSkills.length >= maxSkills) return
        if (selectedSkills.some(s => s.name === name)) return

        onChange([...selectedSkills, { name, level }])
        setQuery("")
        setShowSuggestions(false)
        inputRef.current?.focus()
    }

    const removeSkill = (name: string) => {
        onChange(selectedSkills.filter(s => s.name !== name))
    }

    const updateLevel = (name: string, level: 1 | 2 | 3) => {
        onChange(selectedSkills.map(s => s.name === name ? { ...s, level } : s))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setHighlightedIndex(prev => (prev + 1) % suggestions.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (showSuggestions && suggestions.length > 0) {
                addSkill(suggestions[highlightedIndex])
            } else if (query && !selectedSkills.some(s => s.name === query)) {
                // Allow adding custom skills not in list
                addSkill(query)
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false)
        }
    }

    return (
        <div className="space-y-4" ref={containerRef}>
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setShowSuggestions(true)
                            setHighlightedIndex(0)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedSkills.length >= maxSkills ? "Max skills reached" : "Add a skill (e.g. React, Figma)..."}
                        disabled={selectedSkills.length >= maxSkills}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showSuggestions && (query.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-2 bg-popover border rounded-xl shadow-lg overflow-hidden"
                        >
                            {suggestions.length > 0 ? (
                                <ul>
                                    {suggestions.map((skill, index) => (
                                        <li
                                            key={skill}
                                            onClick={() => addSkill(skill)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between ${index === highlightedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                                                }`}
                                        >
                                            <span>{skill}</span>
                                            <Plus className="h-3.5 w-3.5 opacity-50" />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div
                                    onClick={() => addSkill(query)}
                                    className="px-4 py-3 text-sm cursor-pointer hover:bg-accent/50 flex items-center gap-2 text-muted-foreground"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add "{query}"
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Selected Skills List */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {selectedSkills.map((skill) => (
                        <motion.div
                            key={skill.name}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center justify-between p-3 rounded-xl border bg-card/50 backdrop-blur-sm group hover:border-border transition-colors"
                        >
                            <span className="font-medium text-sm">{skill.name}</span>

                            <div className="flex items-center gap-3">
                                {/* Star Rating */}
                                <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1">
                                    {[1, 2, 3].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => updateLevel(skill.name, star as 1 | 2 | 3)}
                                            className={`p-0.5 rounded hover:bg-background transition-colors ${skill.level >= star ? "text-amber-400" : "text-muted-foreground/20"
                                                }`}
                                            title={star === 1 ? "Beginner" : star === 2 ? "Intermediate" : "Expert"}
                                        >
                                            <Star className="h-3.5 w-3.5 fill-current" />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => removeSkill(skill.name)}
                                    className="p-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {selectedSkills.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground/50">
                        <p className="text-sm">No skills added yet</p>
                    </div>
                )}
            </div>

            <div className="text-xs text-muted-foreground text-center">
                Suggest adding 5+ skills to improve matching
            </div>
        </div>
    )
}
