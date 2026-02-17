"use client"

import { useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { Heart, Bell, UserCheck, Send, PartyPopper, Check, X, MessageCircle } from "lucide-react";
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal";
import { AnimatePresence, motion } from "framer-motion";

type Activity = {
    id: string;
    type: 'liked_you' | 'matched' | 'you_liked' | 'request_accepted' | 'you_passed';
    userId: string;
    userName: string;
    userPhoto?: string;
    userInitial: string;
    timestamp: string;
    message: string;
};

export default function LikesPage() {
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<{ name: string, message: string } | null>(null);
    const [likedByUsers, setLikedByUsers] = useState<UserProfile[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const email = localStorage.getItem("user_email");
                if (!email) return;

                const [likesRes, activityRes] = await Promise.all([
                    fetch(`/api/likes?userId=${email}`),
                    fetch(`/api/activity?userId=${email}`)
                ]);

                if (likesRes.ok) {
                    const likesData = await likesRes.json();
                    setLikedByUsers(likesData);
                }
                if (activityRes.ok) {
                    setActivities(await activityRes.json());
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAction = async (targetUser: UserProfile, action: 'like' | 'pass') => {
        setLikedByUsers(prev => prev.filter(u => u.id !== targetUser.id));

        try {
            const email = localStorage.getItem("user_email");
            if (!email) return;

            // Handle Team Application
            if ((targetUser as any).isTeamApplication) {
                const teamAction = action === 'like' ? 'approve' : 'reject';
                await fetch('/api/teams/application-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: email,
                        applicationId: (targetUser as any).applicationId,
                        action: teamAction
                    })
                });

                // Add local activity for immediate feedback
                const newActivity: Activity = {
                    id: `app_action_${targetUser.id}_${Date.now()}`,
                    type: action === 'like' ? 'request_accepted' : 'you_passed',
                    userId: targetUser.id,
                    userName: `${targetUser.personal.firstName} ${targetUser.personal.lastName}`,
                    userInitial: targetUser.personal.firstName[0],
                    timestamp: new Date().toISOString(),
                    message: action === 'like'
                        ? `You accepted ${targetUser.personal.firstName}'s application to ${(targetUser as any).teamName}`
                        : `You rejected ${targetUser.personal.firstName}'s application`
                };
                setActivities(prev => [newActivity, ...prev]);
                return;
            }

            // Handle Profile Like
            const res = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: email,
                    targetId: targetUser.id,
                    action: action
                })
            });

            const data = await res.json();

            const newActivity: Activity = {
                id: `action_${targetUser.id}_${Date.now()}`,
                type: data.matched ? 'matched' : (action === 'like' ? 'you_liked' : 'you_passed'),
                userId: targetUser.id,
                userName: `${targetUser.personal.firstName} ${targetUser.personal.lastName}`,
                userInitial: targetUser.personal.firstName[0],
                timestamp: new Date().toISOString(),
                message: data.matched
                    ? `You and ${targetUser.personal.firstName} are now connected! 🎉`
                    : action === 'like'
                        ? `You accepted ${targetUser.personal.firstName}'s request`
                        : `You passed on ${targetUser.personal.firstName}'s request`
            };
            setActivities(prev => [newActivity, ...prev]);
        } catch (error) {
            console.error(`Failed to ${action} user:`, error);
        }
    };

    const formatTime = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'liked_you': return <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />;
            case 'matched': return <UserCheck className="h-4 w-4 text-emerald-500" />;
            case 'you_liked': return <Send className="h-4 w-4 text-blue-500" />;
            case 'request_accepted': return <PartyPopper className="h-4 w-4 text-amber-500" />;
            case 'you_passed': return <X className="h-4 w-4 text-red-400" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getActivityBg = (type: string) => {
        switch (type) {
            case 'liked_you': return 'bg-rose-500/10 dark:bg-rose-500/20';
            case 'matched': return 'bg-emerald-500/10 dark:bg-emerald-500/20';
            case 'you_liked': return 'bg-blue-500/10 dark:bg-blue-500/20';
            case 'request_accepted': return 'bg-amber-500/10 dark:bg-amber-500/20';
            case 'you_passed': return 'bg-red-500/10 dark:bg-red-500/20';
            default: return 'bg-muted';
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent mb-3" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 pb-24 overflow-y-auto">

            {/* ============================
                SECTION 1: REQUESTS
                Only visible when there are pending requests
               ============================ */}
            {likedByUsers.length > 0 && (
                <section className="lg:hidden">
                    <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                        <h2 className="text-lg font-bold">Requests</h2>
                    </div>
                    <p className="text-sm text-emerald-500 mb-4">
                        {likedByUsers.length} {likedByUsers.length === 1 ? 'person' : 'people'} awaiting response
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <AnimatePresence>
                            {likedByUsers.map((user: any) => (
                                <motion.div
                                    key={(user as any).requestId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted group"
                                >
                                    <div onClick={() => setSelectedProfile(user)} className="absolute inset-0 cursor-pointer">
                                        {/* Photo or Gradient Placeholder */}
                                        {user.visuals?.photos?.[0] ? (
                                            <img src={user.visuals.photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-orange-300" />
                                                <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/20">
                                                    {user.personal.firstName[0]}
                                                </div>
                                            </>
                                        )}

                                        {/* Content Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white pb-14">
                                            {(user as any).isTeamApplication && (
                                                <div className="mb-1">
                                                    <span className="bg-indigo-500/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                        Team Application
                                                    </span>
                                                </div>
                                            )}
                                            <h3 className="font-bold text-lg leading-tight">{user.personal.firstName}, {user.personal.age}</h3>
                                            <p className="text-xs text-white/80">{user.professionalDetails.year} Yr • {user.professionalDetails.domains?.[0]}</p>

                                            {(user as any).isTeamApplication ? (
                                                <div className="mt-1">
                                                    <p className="text-xs text-white/90">Applied to: <span className="font-semibold text-indigo-300">{(user as any).teamName}</span></p>
                                                    {(user as any).joinNote && (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); setSelectedMessage({ name: `${user.personal.firstName} ${user.personal.lastName}`, message: (user as any).joinNote }); }}
                                                            className="flex items-start gap-1.5 mt-1 bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-indigo-500/30 active:scale-95 transition-transform"
                                                        >
                                                            <MessageCircle className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                                                            <p className="text-[11px] text-white/90 italic line-clamp-2">
                                                                "{(user as any).joinNote}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                (user as any).joinNote && (
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); setSelectedMessage({ name: `${user.personal.firstName} ${user.personal.lastName}`, message: (user as any).joinNote }); }}
                                                        className="flex items-start gap-1.5 mt-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1.5 active:scale-95 transition-transform"
                                                    >
                                                        <MessageCircle className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                                                        <p className="text-[11px] text-white/90 italic line-clamp-2">
                                                            "{(user as any).joinNote}"
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 px-2 z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(user, 'pass'); }}
                                            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500/60 transition-all duration-200"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(user, 'like'); }}
                                            className={`h-9 w-9 rounded-full text-white flex items-center justify-center transition-all duration-200 shadow-lg ${user.isTeamApplication ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </section>
            )}

            {/* ============================
                SECTION 2: NOTIFICATIONS
                Always visible, fills space if no requests
               ============================ */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-bold">Notifications</h2>
                </div>

                {activities.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No notifications yet</p>
                        <p className="text-xs mt-1">Your activity will show up here</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {activities.map((activity, index) => (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${activity.type === 'request_accepted' || activity.type === 'matched'
                                    ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/15'
                                    : 'bg-card border-border/50 hover:border-border'
                                    }`}
                            >
                                {/* Avatar */}
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getActivityBg(activity.type)}`}>
                                    {activity.userPhoto ? (
                                        <img src={activity.userPhoto} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold">{activity.userInitial}</span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold leading-tight">{activity.userName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.message}</p>
                                </div>

                                {/* Icon + Time */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {getActivityIcon(activity.type)}
                                    <span className="text-[10px] text-muted-foreground">{formatTime(activity.timestamp)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            <AnimatePresence>
                {selectedProfile && (
                    <ProfileDetailModal
                        profile={selectedProfile}
                        onClose={() => setSelectedProfile(null)}
                    />
                )}
            </AnimatePresence>

            {/* Message Modal (Mobile Alert) */}
            <AnimatePresence>
                {selectedMessage && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 h-screen fixed top-0 left-0">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedMessage(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-xs bg-card border rounded-2xl shadow-xl p-6 z-10 mx-auto"
                        >
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="absolute top-2 right-2 p-2 hover:bg-muted rounded-full text-muted-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="flex flex-col gap-4 text-center">
                                <div className="h-12 w-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                                    <MessageCircle className="h-6 w-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">{selectedMessage.name}</h3>
                                    <p className="text-sm text-foreground/90 italic p-4 bg-muted/50 rounded-xl max-h-[60vh] overflow-y-auto">
                                        "{selectedMessage.message}"
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
