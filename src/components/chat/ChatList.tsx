
"use client"

import { useState } from "react"
import { useChat } from "@/context/ChatContext"
import { Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function ChatList({ onSelect }: { onSelect?: () => void }) {
    const { conversations, selectedConversationId, selectConversation, isLoading } = useChat()
    const [searchQuery, setSearchQuery] = useState("")

    // Filter by name (works for both DMs and team names)
    const filtered = conversations.filter((conv) =>
        conv.friendName?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground text-sm">Loading chats...</div>
    }

    return (
        <div className="flex flex-col h-full bg-card md:border-r">
            {/* Header */}
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold mb-4">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-muted/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm mt-10">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            {searchQuery ? "🔍" : "👋"}
                        </div>
                        <p>{searchQuery ? `No chats found for "${searchQuery}"` : "No conversations yet."}</p>
                        {!searchQuery && <p className="text-xs mt-1">Match with people to start chatting!</p>}
                    </div>
                ) : (
                    filtered.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => {
                                selectConversation(conv.id, conv.friendId, conv.type)
                                if (onSelect) onSelect()
                            }}
                            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${selectedConversationId === conv.id ? "bg-muted/50" : ""
                                }`}
                        >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div className="h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                    {conv.friendPhoto ? (
                                        <img src={conv.friendPhoto} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className={`h-full w-full flex items-center justify-center font-bold text-xl ${conv.type === 'group' ? 'bg-orange-500/10 text-orange-600' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                            {conv.type === 'group' ? (
                                                <span className="text-2xl">👥</span>
                                            ) : (
                                                conv.friendName?.[0] || "?"
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className="font-semibold text-base truncate">{conv.friendName}</h3>
                                    {conv.lastMessageAt && (
                                        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })
                                                    .replace("about ", "")
                                                    .replace(" minutes", "m")
                                                    .replace(" hours", "h")}
                                            </span>
                                            {conv.unreadCount && conv.unreadCount > 0 ? (
                                                <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center">
                                                    {conv.unreadCount}
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                                <p className={`text-sm truncate leading-snug ${!conv.lastMessage ? 'italic text-muted-foreground' : 'text-muted-foreground'}`}>
                                    {conv.lastMessage || "Start a conversation"}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
