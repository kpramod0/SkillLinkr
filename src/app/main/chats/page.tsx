"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserProfile } from "@/types";
import { Search, ArrowLeft, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal";
import { AnimatePresence, motion } from "framer-motion";

export default function ChatsPage() {
    const [view, setView] = useState<'messages' | 'requests'>('messages');
    const [chats, setChats] = useState<{ primary: any[], requests: any[] }>({ primary: [], requests: [] });
    const [loading, setLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const email = localStorage.getItem("user_email");
                if (!email) return;

                const res = await fetch(`/api/chats?userId=${email}`);
                if (res.ok) {
                    const data = await res.json();
                    setChats(data);
                }
            } catch (error) {
                console.error("Failed to fetch chats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
    }, []);

    const currentList = view === 'messages' ? chats.primary : chats.requests;

    const filteredChats = currentList.filter(chat => {
        const query = searchQuery.toLowerCase();
        const fullName = `${chat.personal.firstName} ${chat.personal.lastName}`.toLowerCase();
        return fullName.includes(query);
    });

    return (
        <div className="p-4 space-y-4 pb-24">

            {/* Instagram-style Header */}
            {view === 'messages' ? (
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Messages</h1>
                    <button
                        onClick={() => setView('requests')}
                        className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                        Requests
                        {chats.requests.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                                {chats.requests.length}
                            </span>
                        )}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setView('messages')}
                        className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-bold">Requests</h1>
                    {chats.requests.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {chats.requests.length}
                        </span>
                    )}
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search conversations..."
                    className="pl-9 bg-muted/50 border-0"
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Request notice when in messages view */}
            {view === 'messages' && chats.requests.length > 0 && (
                <button
                    onClick={() => setView('requests')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors"
                >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{chats.requests.length}</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-medium">Message requests</p>
                        <p className="text-xs text-muted-foreground">
                            {chats.requests.length} {chats.requests.length === 1 ? 'person' : 'people'} wants to connect
                        </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                </button>
            )}

            {/* Chat List */}
            <div>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading chats...</div>
                ) : filteredChats.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        {searchQuery ? "No results found." : view === 'messages' ? "No messages yet." : "No new requests."}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredChats.map(chat => (
                            <Link
                                href={`/main/chats/${chat.id}`}
                                key={chat.id}
                                className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors"
                            >
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5" onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedProfile(chat);
                                }}>
                                    <div className="h-full w-full bg-background rounded-full p-0.5">
                                        <div className="h-full w-full bg-muted rounded-full flex items-center justify-center text-lg font-bold">
                                            {/* Show Team Icon or Initial */}
                                            {chat.isTeam ? (
                                                <Users className="h-6 w-6 text-primary" />
                                            ) : (
                                                chat.personal.firstName[0]
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-semibold truncate">
                                            {chat.isTeam ? chat.personal.firstName : `${chat.personal.firstName} ${chat.personal.lastName}`}
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {chat.lastMessage}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedProfile && (
                    <ProfileDetailModal
                        profile={selectedProfile}
                        onClose={() => setSelectedProfile(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
