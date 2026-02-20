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
        <div className="bg-[#1A1A2E]/80 backdrop-blur-md p-1.5 rounded-[22px] flex relative w-full max-w-[300px] sm:w-[420px] mx-auto mb-4 border border-white/10 shadow-xl">
            {/* Animated Background Pill */}
            <motion.div
                layout
                className="absolute top-1.5 bottom-1.5 bg-black rounded-[18px] shadow-lg border border-white/5"
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
                    className={`flex-1 flex items-center justify-center gap-2.5 text-[11px] sm:text-xs md:text-sm font-semibold relative z-10 py-2.5 sm:py-3.5 transition-all duration-300 ${mode === option.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <option.icon className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 ${mode === option.id ? 'scale-110' : 'scale-100'}`} />
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.label}</span>
                </button>
            ))}
        </div>
    )
}
