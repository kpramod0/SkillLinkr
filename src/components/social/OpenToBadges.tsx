"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

const BADGES = [
    { id: "Hackathon", label: "Hackathon 🏆", color: "bg-orange-500/10 text-orange-600 border-orange-500" },
    { id: "Research", label: "Research 🔬", color: "bg-purple-500/10 text-purple-600 border-purple-500" },
    { id: "Project", label: "Project 📱", color: "bg-blue-500/10 text-blue-600 border-blue-500" },
    { id: "Study Group", label: "Study Group 🎓", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500" },
    { id: "Startup", label: "Startup 💼", color: "bg-pink-500/10 text-pink-600 border-pink-500" },
    { id: "Open to All", label: "Open to All 🤝", color: "bg-gray-500/10 text-gray-600 border-gray-500" },
]

interface OpenToBadgesProps {
    selected?: string[]
    onChange?: (badges: string[]) => void
    readonly?: boolean
}

export function OpenToBadges({ selected = [], onChange, readonly = false }: OpenToBadgesProps) {
    const handleToggle = (id: string) => {
        if (readonly || !onChange) return
        if (selected.includes(id)) {
            onChange(selected.filter(b => b !== id))
        } else {
            onChange([...selected, id])
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {BADGES.map((badge) => {
                const isSelected = selected.includes(badge.id)
                const isInactive = !isSelected && readonly

                if (isInactive) return null

                return (
                    <motion.button
                        key={badge.id}
                        whileTap={{ scale: readonly ? 1 : 0.95 }}
                        onClick={() => handleToggle(badge.id)}
                        className={`relative px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isSelected
                                ? `${badge.color} shadow-sm ring-1 ring-inset ring-opacity-50`
                                : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                            } ${readonly ? "cursor-default" : "cursor-pointer"}`}
                    >
                        {badge.label}
                        {isSelected && !readonly && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                                <Check className="h-2 w-2 text-white" strokeWidth={4} />
                            </div>
                        )}
                    </motion.button>
                )
            })}

            {readonly && selected.length === 0 && (
                <span className="text-xs text-muted-foreground italic">Not specified</span>
            )}
        </div>
    )
}
