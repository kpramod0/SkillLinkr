
"use client"

import { useEffect, useState } from "react"
import { HackathonCard } from "@/components/discovery/HackathonCard"
import { Loader2, Trophy } from "lucide-react"

type Hackathon = {
    id: string
    title: string
    description: string
    start_date: string
    end_date: string
    registration_link: string
    image_url: string
    tags: string[]
    location?: string
    organizer?: string
}

export default function HackathonFeed() {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchHackathons = async () => {
            try {
                const res = await fetch('/api/hackathons')
                if (res.ok) {
                    const data = await res.json()
                    setHackathons(data)
                }
            } catch (error) {
                console.error("Failed to fetch hackathons", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchHackathons()
    }, [])

    return (
        <div className="h-full flex flex-col bg-background/50 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Hackathons</h1>
                        <p className="text-muted-foreground">Discover upcoming challenges and build your dream team.</p>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hackathons.map(hackathon => (
                            <HackathonCard key={hackathon.id} hackathon={hackathon} />
                        ))}

                        {hackathons.length === 0 && (
                            <div className="col-span-full text-center py-20 text-muted-foreground">
                                No upcoming hackathons found. Check back later!
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
