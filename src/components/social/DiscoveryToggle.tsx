import { motion } from "framer-motion"
import { Users, Briefcase, UserCheck } from "lucide-react"

type ToggleMode = 'people' | 'teams' | 'my-teams'

interface DiscoveryToggleProps {
    mode: ToggleMode
    onChange: (mode: ToggleMode) => void
}

export function DiscoveryToggle({ mode, onChange }: DiscoveryToggleProps) {
    const options = [
        { id: 'people', label: 'People', icon: Users },
        { id: 'teams', label: 'Team', icon: Briefcase },
        { id: 'my-teams', label: 'Mine', icon: UserCheck },
    ] as const

    const activeIndex = options.findIndex(o => o.id === mode)

    return (
        <div className="bg-muted/50 p-1 rounded-full flex relative w-64 mx-auto mb-4 border border-border/50">
            {/* Animated Background */}
            <motion.div
                layout
                className="absolute top-1 bottom-1 bg-background rounded-full shadow-sm border border-border"
                initial={false}
                animate={{
                    left: `calc(${activeIndex * 33.33}% + 4px)`,
                    width: 'calc(33.33% - 8px)'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium relative z-10 py-1.5 transition-colors ${mode === option.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                >
                    <option.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.label === 'People' ? 'Ppl' : option.label === 'Team' ? 'Team' : 'Mine'}</span>
                </button>
            ))}
        </div>
    )
}
