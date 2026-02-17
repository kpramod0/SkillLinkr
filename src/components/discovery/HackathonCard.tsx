
import { Calendar, MapPin, ExternalLink } from "lucide-react"

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

export function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
    const startDate = new Date(hackathon.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endDate = new Date(hackathon.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={hackathon.image_url}
                    alt={hackathon.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white border border-white/20">
                    {hackathon.organizer || 'Event'}
                </div>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg line-clamp-1">{hackathon.title}</h3>
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2 mb-4 h-10">
                    {hackathon.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {hackathon.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-md font-medium">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{startDate} - {endDate}</span>
                    </div>
                    {hackathon.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{hackathon.location}</span>
                        </div>
                    )}
                </div>

                <a
                    href={hackathon.registration_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                    Apply Now
                    <ExternalLink className="h-4 w-4" />
                </a>
            </div>
        </div>
    )
}
