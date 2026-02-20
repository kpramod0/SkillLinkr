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
        <div className="bg-[#1A1A2E]/80 backdrop-blur-md p-1.5 rounded-full flex relative w-full mx-auto border border-white/10 shadow-xl">
            {/* Animated Background Pill */}
            <motion.div
                layout
                className="absolute top-1.5 bottom-1.5 bg-black rounded-full shadow-lg border border-white/5"
                initial={false}
                animate={{
                    left: `calc(${activeIndex * 33.33}% + 6px)`,
                    width: 'calc(33.33% - 12px)'
                }}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />

            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 text-[11px] font-semibold relative z-10 py-2.5 transition-all duration-300 whitespace-nowrap ${mode === option.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <option.icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${mode === option.id ? 'scale-110' : 'scale-100'}`} />
                    <span className="truncate">{option.label}</span>
                </button>
            ))}
        </div>
    )
}
