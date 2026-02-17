"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { UserProfile } from "@/types"
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal"

interface Message {
    id: string
    content: string
    sender: 'me' | 'them'
    timestamp: Date
}

export function ChatWindow({ matchId }: { matchId: string }) {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Modal handling
    const [showProfile, setShowProfile] = useState(false)
    const [profileData, setProfileData] = useState<UserProfile | null>(null)
    const [loadingProfile, setLoadingProfile] = useState(true);

    const decodedMatchId = decodeURIComponent(matchId);

    // Initial Setup
    useEffect(() => {
        const email = localStorage.getItem("user_email");
        if (email) setCurrentUserId(email);

        const fetchChatDetails = async () => {
            try {
                // CASE A: TEAM CHAT
                if (decodedMatchId.startsWith('team_')) {
                    const teamId = decodedMatchId.replace('team_', '');
                    const res = await fetch(`/api/teams/${teamId}`);
                    if (res.ok) {
                        const team = await res.json();
                        setProfileData({
                            id: decodedMatchId,
                            personal: {
                                firstName: team.title,
                                lastName: '(Team)',
                                gender: 'Team',
                                age: 0,
                                year: ''
                            },
                            visuals: { photos: [], bio: team.description || 'Team Chat' },
                            professional: { domains: [], languages: [] },
                            preferences: { interestedIn: [] },
                            onboardingCompleted: true
                        } as UserProfile);
                    }
                }
                // CASE B: DIRECT MESSAGE
                else {
                    const res = await fetch('/api/profiles');
                    if (res.ok) {
                        const profiles: UserProfile[] = await res.json();
                        const found = profiles.find(p => p.id === decodedMatchId);
                        if (found) {
                            setProfileData(found);
                        } else {
                            // Fallback
                            setProfileData({
                                id: decodedMatchId,
                                personal: { firstName: decodedMatchId.split('@')[0], lastName: '', gender: 'Other', age: 0, year: '1st' },
                                visuals: { photos: [], bio: '' },
                                professional: { domains: [], languages: [] },
                                preferences: { interestedIn: [] },
                                onboardingCompleted: true
                            } as UserProfile);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch details", e);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchChatDetails();
    }, [decodedMatchId]);

    const [isMatch, setIsMatch] = useState(true);
    const [lastActive, setLastActive] = useState<number | null>(null);

    const isUserOnline = () => {
        if (!lastActive) return false;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return lastActive > fiveMinutesAgo;
    };

    // Fetch Messages
    const fetchMessages = async () => {
        const email = localStorage.getItem("user_email");
        if (!email) return;

        try {
            const res = await fetch(`/api/chats/${decodedMatchId}?userId=${email}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
                setIsMatch(data.isMatch);
                if (data.isTeam) {
                    setLastActive(null); // Teams don't have online status
                } else {
                    setLastActive(data.otherUserLastActive);
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Supabase Realtime
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const isTeam = decodedMatchId.startsWith('team_');
        const realTeamId = isTeam ? decodedMatchId.replace('team_', '') : null;

        const channel = supabase
            .channel(`chat-${decodedMatchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: isTeam ? `team_id=eq.${realTeamId}` : undefined
                },
                (payload: any) => {
                    const msg = payload.new;
                    const email = localStorage.getItem("user_email");

                    // Filter for DM if not team (since we can't filter by complicated OR in realtime easily without row level checks usually, but here we can check in callback)
                    let isRelevant = false;

                    if (isTeam) {
                        isRelevant = msg.team_id === realTeamId;
                    } else {
                        isRelevant =
                            (msg.sender_id === email && msg.receiver_id === decodedMatchId) ||
                            (msg.sender_id === decodedMatchId && msg.receiver_id === email);
                    }

                    if (isRelevant && msg.sender_id !== email) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, {
                                id: msg.id,
                                content: msg.content,
                                sender: 'them',
                                timestamp: new Date(msg.timestamp)
                            }];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [decodedMatchId]);

    useEffect(() => {
        // Auto scroll to bottom
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!inputText.trim() || !currentUserId) return

        const tempId = Date.now().toString();
        const content = inputText;

        // Optimistic UI
        const newMessage: Message = {
            id: tempId,
            content: content,
            sender: 'me',
            timestamp: new Date()
        }
        setMessages(prev => [...prev, newMessage])
        setInputText("")

        try {
            const isTeam = decodedMatchId.startsWith('team_');
            const payload = isTeam
                ? {
                    senderId: currentUserId,
                    teamId: decodedMatchId.replace('team_', ''),
                    content: content
                }
                : {
                    senderId: currentUserId,
                    receiverId: decodedMatchId,
                    content: content
                };

            await fetch('/api/chats/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // Refresh messages to get server state (timestamp, etc)
            fetchMessages();
        } catch (error) {
            console.error("Failed to send message:", error);
            // Revert optimistic update? Or just show error.
        }
    }

    const handleAccept = async () => {
        if (!currentUserId) return;
        try {
            await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    targetId: decodedMatchId,
                    action: 'like'
                })
            });
            fetchMessages(); // Refresh to update isMatch status
        } catch (error) {
            console.error("Failed to accept request:", error);
        }
    }

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-background/80 backdrop-blur top-0 sticky z-10 w-full">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfile(true)}>
                    {profileData?.visuals?.photos && profileData.visuals.photos.length > 0 ? (
                        <img src={profileData.visuals.photos[0]} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {profileData?.personal.firstName[0] || '?'}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold leading-none">
                            {profileData ? `${profileData.personal.firstName} ${profileData.personal.lastName}` : 'Loading...'}
                        </h3>
                        <span className={`text-xs ${isUserOnline() ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            {isUserOnline() ? 'Online now' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Request Banner */}
            {!isMatch && messages.length > 0 && messages[messages.length - 1].sender === 'them' && !messages.some(m => m.sender === 'me') && (
                <div className="bg-muted px-4 py-3 flex items-center justify-between border-b">
                    <p className="text-sm text-muted-foreground">
                        {profileData?.personal.firstName} sent you a message request.
                    </p>
                    <Button size="sm" onClick={handleAccept} className="bg-primary text-primary-foreground">
                        Accept Chat
                    </Button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-10">
                        <p>No messages yet.</p>
                        <p className="text-sm">Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={
                                `max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'me'
                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                    : 'bg-muted rounded-bl-sm'
                                }`
                            }>
                                {msg.content}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="rounded-full bg-muted border-0 focus-visible:ring-1"
                    />
                    <Button size="icon" type="submit" className="rounded-full h-10 w-10 shrink-0">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>

            <AnimatePresence>
                {showProfile && profileData && (
                    <ProfileDetailModal
                        profile={profileData}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
