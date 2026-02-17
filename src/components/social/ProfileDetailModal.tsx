"use client"

import { useState, useEffect } from "react"
import { UserProfile, PortfolioProject } from "@/types"
import { motion } from "framer-motion"
import Link from "next/link"
import { useChat } from "@/context/ChatContext"
import { useDiscovery } from "@/context/DiscoveryContext"
import { X, MapPin, Briefcase, GraduationCap, Github, Linkedin, Languages, MessageCircle, Star, ExternalLink, FolderGit2, CheckCircle2, ChevronDown, ChevronUp, MoreVertical, Flag, Ban, Medal, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpenToBadges } from "@/components/social/OpenToBadges"

import { ThumbsUp, GitFork, Star as StarIcon, Eye } from "lucide-react"
import { GitHubStats } from "@/types"

function GitHubStatsSection({ customProfileUrl }: { customProfileUrl: string }) {
    const [stats, setStats] = useState<GitHubStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Extract username from URL (e.g. https://github.com/username)
                const username = customProfileUrl.split('/').filter(Boolean).pop()
                if (!username) return

                const res = await fetch(`/api/github/stats?username=${username}`)
                if (!res.ok) throw new Error('Failed')
                const data = await res.json()
                setStats(data)
            } catch (err) {
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [customProfileUrl])

    if (loading) return <div className="mt-6 p-4 bg-muted/30 rounded-xl text-center text-sm text-muted-foreground animate-pulse">Loading GitHub Stats...</div>
    if (error || !stats) return null // Hide if fails

    return (
        <div className="mt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub Stats
            </h3>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                {/* Overview Grid */}
                <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
                    <div className="p-3 text-center">
                        <div className="text-lg font-bold">{stats.followers}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Followers</div>
                    </div>
                    <div className="p-3 text-center">
                        <div className="text-lg font-bold">{stats.publicRepos}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Repos</div>
                    </div>
                    <div className="p-3 text-center">
                        <div className="text-lg font-bold">{stats.totalStars}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Stars</div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Languages Bar */}
                    {stats.topLanguages.length > 0 && (
                        <div>
                            <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
                                <span>Top Languages</span>
                            </div>
                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                                {stats.topLanguages.map((lang) => (
                                    <div
                                        key={lang.name}
                                        style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                                        className="h-full"
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                {stats.topLanguages.slice(0, 4).map(lang => (
                                    <div key={lang.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                                        <span>{lang.name} <span className="opacity-70">{lang.percentage}%</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Repos */}
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                            <span>Top Repositories</span>
                            <a href={`https://github.com/${stats.username}?tab=repositories`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View All</a>
                        </div>
                        <div className="space-y-2">
                            {stats.topRepos.slice(0, 3).map(repo => (
                                <a
                                    key={repo.name}
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">{repo.name}</span>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                            <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                                            {repo.stars}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                        {repo.description || "No description provided"}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        {repo.language && (
                                            <span className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                                {repo.language}
                                            </span>
                                        )}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Sub-component: collapsible project showcase
function ProjectShowcase({ portfolio, profileId }: { portfolio: PortfolioProject[], profileId: string }) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const [endorsedProjects, setEndorsedProjects] = useState<Set<string>>(new Set())

    const toggle = (idx: number) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(idx) ? next.delete(idx) : next.add(idx)
            return next
        })
    }

    const handleEndorse = async (projectTitle: string) => {
        const endorserId = localStorage.getItem('user_email');
        if (!endorserId) return;

        // Optimistic UI updates could go here, but for now we wait
        try {
            const res = await fetch('/api/projects/endorse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: profileId,
                    endorserId,
                    projectTitle
                })
            });

            if (res.ok) {
                setEndorsedProjects(prev => new Set(prev).add(projectTitle));
                alert(`You endorsed "${projectTitle}"! (+20 Reputation)`);
            } else {
                const data = await res.json();
                if (res.status === 409) {
                    setEndorsedProjects(prev => new Set(prev).add(projectTitle)); // Already endorsed
                    alert("You have already endorsed this project.");
                } else if (data.error === 'Cannot endorse yourself') {
                    alert("Nice try! You can't endorse yourself.");
                } else {
                    alert("Failed to endorse project.");
                }
            }
        } catch (error) {
            console.error("Endorsement failed", error);
        }
    }

    return (
        <div className="mt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FolderGit2 className="h-4 w-4" />
                Project Showcase ({portfolio.length})
            </h3>
            <div className="space-y-3">
                {portfolio.map((project, idx) => (
                    <div key={idx} className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                        {/* Clickable header */}
                        <button
                            onClick={() => toggle(idx)}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                            <span className="font-bold text-sm">{project.projectTitle || `Project ${idx + 1}`}</span>
                            {expanded.has(idx) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {/* Expanded content */}
                        {expanded.has(idx) && (
                            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                                {project.projectDescription && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">{project.projectDescription}</p>
                                )}

                                {/* Screenshot */}
                                {project.projectScreenshot && (
                                    <img
                                        src={project.projectScreenshot}
                                        alt={`${project.projectTitle} screenshot`}
                                        className="w-full max-w-xs h-40 object-cover rounded-lg border shadow-sm"
                                    />
                                )}

                                {/* Actions Row */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    {/* Links */}
                                    <div className="flex flex-wrap gap-2">
                                        {project.projectLink && (
                                            <a href={project.projectLink} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity">
                                                <ExternalLink className="h-3 w-3" /> Live Project
                                            </a>
                                        )}
                                        {project.githubRepoLink && (
                                            <a href={project.githubRepoLink} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full border transition-colors">
                                                <Github className="h-3 w-3" /> GitHub Repo
                                            </a>
                                        )}
                                    </div>

                                    {/* Endorse Button */}
                                    {project.projectTitle && (
                                        <button
                                            onClick={() => handleEndorse(project.projectTitle)}
                                            disabled={endorsedProjects.has(project.projectTitle)}
                                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${endorsedProjects.has(project.projectTitle)
                                                ? "bg-green-500/10 text-green-600 border-green-500/20 cursor-default"
                                                : "bg-background hover:bg-muted text-muted-foreground hover:text-primary border-dashed"
                                                }`}
                                        >
                                            <ThumbsUp className="h-3 w-3" />
                                            {endorsedProjects.has(project.projectTitle) ? "Endorsed" : "Endorse"}
                                        </button>
                                    )}
                                </div>

                                {/* Contributions */}
                                {project.topContributions && project.topContributions.length > 0 && (
                                    <div className="pt-2 border-t border-border/30">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold block mb-2">Key Contributions</span>
                                        <div className="space-y-1.5">
                                            {project.topContributions.map((c, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                    <span>{c}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

interface ProfileDetailModalProps {
    profile: UserProfile
    onClose: () => void
}

export function ProfileDetailModal({ profile, onClose }: ProfileDetailModalProps) {
    const [isStarred, setIsStarred] = useState(false);
    const [isMatched, setIsMatched] = useState(false);
    const { openChatWith } = useChat();
    const { refreshBlocked } = useDiscovery();

    // ... (rest of component) ...

    const [showMenu, setShowMenu] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');

    const handleBlock = async () => {
        const userId = localStorage.getItem('user_email');
        if (!userId || !confirm(`Are you sure you want to block ${profile.personal.firstName}? They will be hidden from your feed and cannot message you.`)) return;

        try {
            await fetch('/api/user/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockerId: userId, blockedId: profile.id })
            });
            refreshBlocked();
            onClose();
            alert("User blocked.");
        } catch (error) {
            console.error(error);
        }
    }

    const handleReport = async () => {
        const userId = localStorage.getItem('user_email');
        if (!userId) return;

        try {
            await fetch('/api/user/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporterId: userId,
                    reportedId: profile.id,
                    reason: reportReason,
                    details: reportDetails
                })
            });
            setIsReporting(false);
            alert("Report submitted. Thank you for helping keep our community safe.");
            onClose();
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        const checkStatus = async () => {
            const userId = localStorage.getItem('user_email');
            if (!userId) return;

            try {
                // Check Starred
                const starRes = await fetch(`/api/starred?userId=${userId}`);
                if (starRes.ok) {
                    const starredProfiles: UserProfile[] = await starRes.json();
                    setIsStarred(starredProfiles.some(p => p.id === profile.id));
                }

                // Check Matched
                const matchRes = await fetch(`/api/matches?userId=${userId}`);
                if (matchRes.ok) {
                    const matches: UserProfile[] = await matchRes.json();
                    setIsMatched(matches.some(p => p.id === profile.id));
                }

            } catch (error) {
                console.error("Failed to check status", error);
            }
        }
        checkStatus();
    }, [profile.id]);

    const handleStarToggle = async () => {
        const userId = localStorage.getItem('user_email');
        if (!userId) return;

        const action = isStarred ? 'unstar' : 'star';
        setIsStarred(!isStarred);

        try {
            await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, targetId: profile.id, action })
            });
        } catch (error) {
            console.error("Failed to toggle star", error);
            setIsStarred(isStarred); // Revert
        }
    }

    const handleConnectToggle = async () => {
        const userId = localStorage.getItem('user_email');
        if (!userId) return;

        // If matched -> Unmatch
        // If not matched -> Like (Connect Request)
        const action = isMatched ? 'unmatch' : 'like';

        // Optimistic update
        if (isMatched) {
            setIsMatched(false);
            // If we unmatch, we probably shouldn't be able to re-match immediately in this UI without refresh, 
            // but for now let's just toggle state.
        } else {
            // "Connect" request sent. Usually implies we 'liked' them. 
            // Doesn't guarantee match unless they liked back.
            // But we can disable the button or show "Request Sent"?
            // For simplicity, let's just send 'like'.
        }

        try {
            const res = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, targetId: profile.id, action })
            });

            if (res.ok) {
                const data = await res.json();
                if (action === 'like' && data.matched) {
                    setIsMatched(true); // Instant match!
                }
            }

        } catch (error) {
            console.error("Failed to connect/unmatch", error);
        }
    }
    return (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />

            {/* Modal Content */}
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-sm bg-background border-t sm:border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden h-[90%] pointer-events-auto relative"
            >
                {isReporting ? (
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">Report User</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsReporting(false)}>
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Why are you reporting {profile.personal.firstName}?
                        </p>
                        <div className="space-y-2 mb-6">
                            {['Spam', 'Harassment', 'Fake Profile', 'Inappropriate Content', 'Other'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReportReason(r)}
                                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${reportReason === r ? 'bg-primary/10 border-primary text-primary font-medium' : 'hover:bg-muted'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <textarea
                            placeholder="Additional details (optional)..."
                            className="w-full p-3 rounded-lg border bg-muted/30 text-sm min-h-[100px] mb-6 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                        />
                        <div className="mt-auto">
                            <Button className="w-full" onClick={handleReport} disabled={!reportReason}>
                                Submit Report
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>

                        {/* Close Button */}
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                            {/* More Menu */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full bg-black/20 text-white hover:bg-black/40"
                                    onClick={() => setShowMenu(!showMenu)}
                                >
                                    <MoreVertical className="h-6 w-6" />
                                </Button>

                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border overflow-hidden py-1 z-20">
                                        <button
                                            onClick={() => { setShowMenu(false); setIsReporting(true); }}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-2"
                                        >
                                            <Flag className="h-4 w-4" /> Report User
                                        </button>
                                        <button
                                            onClick={() => { setShowMenu(false); handleBlock(); }}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                        >
                                            <Ban className="h-4 w-4" /> Block User
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-black/20 text-white hover:bg-black/40">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="h-full overflow-y-auto pb-8">
                            {/* Header Image */}
                            <div className="h-80 bg-muted relative">
                                {profile.visuals.photos && profile.visuals.photos.length > 0 ? (
                                    <img
                                        src={profile.visuals.photos[0]}
                                        alt={profile.personal.firstName}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                                        <div className="absolute inset-0 flex items-center justify-center text-8xl font-bold opacity-10">
                                            {profile.personal.firstName[0]}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Info Container */}
                            <div className="px-6 -mt-10 relative">
                                <div className="bg-background rounded-2xl p-6 shadow-sm border border-border/50">
                                    <h2 className="text-3xl font-bold">{profile.personal.firstName} {profile.personal.lastName}</h2>
                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                        <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-sm font-medium">
                                            {profile.personal.age}
                                        </span>
                                        <span>•</span>
                                        <span>{profile.personal.gender}</span>
                                        <span>•</span>
                                        <span>{profile.professionalDetails.year} Year</span>
                                    </div>

                                    <div className="mt-4">
                                        <OpenToBadges selected={profile.professionalDetails.openTo || []} readonly />
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {profile.professionalDetails.domains.map(d => (
                                            <div key={d} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                                                <Briefcase className="h-3.5 w-3.5" />
                                                {d}
                                            </div>
                                        ))}
                                    </div>

                                    {profile.visuals.bio && (
                                        <div className="mt-6">
                                            <h3 className="font-semibold mb-2">About Me</h3>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {profile.visuals.bio}
                                            </p>
                                        </div>
                                    )}

                                    {/* Achievements / Badges Section */}
                                    {profile.achievements && profile.achievements.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                                <Medal className="h-4 w-4 text-purple-500" />
                                                Badges & Achievements
                                            </h3>
                                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                {profile.achievements.map((badge) => (
                                                    <div
                                                        key={badge.id}
                                                        className="flex flex-col items-center shrink-0 w-20 text-center group relative"
                                                    >
                                                        <div className={`w-12 h-12 rounded-full ${badge.color || 'bg-primary'} flex items-center justify-center text-white shadow-md mb-2`}>
                                                            {/* We can map icons dynamically or just use a generic Trophy if dynamic import complicates things */}
                                                            <Trophy className="h-6 w-6" />
                                                        </div>
                                                        <span className="text-[10px] font-bold leading-tight line-clamp-2">{badge.title}</span>

                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-full mb-2 bg-black/80 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                            {badge.description}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-6">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                            Top Skills
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(profile.professionalDetails.skills || []).map(s => (
                                                <span key={s.name} className="bg-amber-500/10 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-md text-xs font-semibold border border-amber-500/20 flex items-center gap-1">
                                                    {s.name}
                                                    <span className="flex text-amber-500">
                                                        {[...Array(s.level)].map((_, i) => <Star key={i} className="h-2 w-2 fill-current" />)}
                                                    </span>
                                                </span>
                                            ))}
                                            {(!profile.professionalDetails.skills || profile.professionalDetails.skills.length === 0) && (
                                                <span className="text-sm text-muted-foreground italic">No skills listed</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* GitHub Stats Section */}
                                    {profile.visuals.github && (
                                        <GitHubStatsSection customProfileUrl={profile.visuals.github} />
                                    )}

                                    <div className="mt-6">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Languages className="h-4 w-4" />
                                            Languages & Tools
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.professionalDetails.languages.map(l => (
                                                <span key={l} className="bg-muted px-3 py-1 rounded-lg text-sm border">
                                                    {l}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Project Showcase */}
                                    {profile.portfolio && profile.portfolio.length > 0 && (
                                        <ProjectShowcase portfolio={profile.portfolio} profileId={profile.id} />
                                    )}

                                    <div className="mt-8 space-y-3">
                                        {/* Primary Actions */}
                                        <div className="flex gap-4">
                                            <Button
                                                className="flex-1 w-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity"
                                                onClick={() => {
                                                    openChatWith(profile.id);
                                                    onClose();
                                                }}
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                                Message
                                            </Button>

                                            <Button
                                                variant={isStarred ? "default" : "outline"}
                                                className={`flex-1 gap-2 ${isStarred ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}`}
                                                onClick={handleStarToggle}
                                            >
                                                <Star className={`h-4 w-4 ${isStarred ? "fill-current" : ""}`} />
                                                {isStarred ? "Starred" : "Star"}
                                            </Button>
                                        </div>

                                        {/* Social Links */}
                                        {(profile.visuals.github || profile.visuals.linkedin) && (
                                            <div className="flex gap-3 pt-2">
                                                {profile.visuals.github && (
                                                    <a href={profile.visuals.github} target="_blank" rel="noopener noreferrer" className="flex-1">
                                                        <Button variant="outline" className="w-full gap-2">
                                                            <Github className="h-4 w-4" /> GitHub
                                                        </Button>
                                                    </a>
                                                )}
                                                {profile.visuals.linkedin && (
                                                    <a href={profile.visuals.linkedin} target="_blank" rel="noopener noreferrer" className="flex-1">
                                                        <Button variant="outline" className="w-full gap-2">
                                                            <Linkedin className="h-4 w-4" /> LinkedIn
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Connect / Unmatch Action */}
                                    <div className="mt-3">
                                        <Button
                                            variant="default"
                                            className={`w-full ${isMatched ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                                            onClick={handleConnectToggle}
                                        >
                                            {isMatched ? "Unmatch" : "Send Connection Request"}
                                        </Button>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </>
                )}
            </motion.div>
        </div>
    )
}
