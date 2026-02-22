
"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useChat } from "@/context/ChatContext"
import { format } from "date-fns"
import { AnimatePresence } from "framer-motion"
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal"
import { GroupMembersModal } from "@/components/chat/GroupMembersModal"
import { UserProfile } from "@/types"

/**
 * ChatWindow Component
 * 
 * Displays the active chat conversation, including messages, header, and input area (handled by parent layout).
 * Wraps logic for:
 * 1. Scrolling to bottom on new message
 * 2. Displaying user/group header info
 * 3. Handling typing indicators
 * 4. Opening profile/member modals
 */
export function ChatWindow() {
    // Access global chat state from context
    const { messages, selectedConversationId, conversations, userId, typingUsers } = useChat()

    // Ref for the message container to handle auto-scrolling
    const scrollRef = useRef<HTMLDivElement>(null)
    const email = userId // Alias for compatibility with existing code

    // --- Local State for Modals ---
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [selectedMemberProfile, setSelectedMemberProfile] = useState<UserProfile | null>(null)
    const [groupMembers, setGroupMembers] = useState<any[]>([])

    // --- Effect: Auto-scroll to bottom ---
    // Triggers whenever the `messages` array changes (new message sent/received)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    // --- Helper: Get Current Conversation Details ---
    const currentConversation = conversations.find(c => c.id === selectedConversationId)

    // Check if current chat is a group (logic based on 'type' field)
    const isGroup = currentConversation?.type === 'group'

    // --- Logic: Typing Indicators ---
    // NOTE: useMemo MUST be before any early returns (Rules of Hooks).
    const typingMessage = useMemo(() => {
        if (typingUsers.size === 0) return null

        const names: string[] = []
        typingUsers.forEach(uid => {
            if (!isGroup && currentConversation?.friendId === uid) {
                names.push(currentConversation.friendName)
            } else if (isGroup) {
                const msg = messages.find(m => m.sender_id === uid)
                names.push(msg?.senderName || msg?.sender?.first_name || 'Member')
            }
        })

        if (names.length === 0) return null
        if (!isGroup) return "typing..."
        if (names.length === 1) return `${names[0]} is typing...`
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`
        return "Multiple people are typing..."
    }, [typingUsers, isGroup, messages, currentConversation])

    // --- Render: Empty State ---
    // If no conversation is selected, show a placeholder
    if (!selectedConversationId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <span className="text-4xl">💭</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Your Messages</h3>
                <p className="text-sm max-w-xs">Select a conversation from the list to start chatting with your matches.</p>
            </div>
        )
    }

    // --- API: Fetch Full Profile ---
    // Called when clicking a user's avatar/name to show detailed modal
    const fetchProfile = async (uid: string) => {
        try {
            const res = await fetch(`/api/profile?email=${uid}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedMemberProfile(data)
                setShowProfileModal(true)
            }
        } catch (error) {
            console.error("Failed to fetch profile", error)
        }
    }

    // --- API: Fetch Group Members ---
    // Called when clicking "View Members" in group chat
    const fetchGroupMembers = async (teamId: string) => {
        try {
            // Strip 'team_' prefix if present to get valid UUID
            const res = await fetch(`/api/teams/${teamId.replace('team_', '')}/members`)
            if (res.ok) {
                const data = await res.json()
                setGroupMembers(data)
                setShowGroupModal(true)
            }
        } catch (error) {
            console.error("Failed to fetch members", error)
        }
    }

    // --- Handler: Header Click ---
    // In DM: Opens friend profile. In Group: Does nothing (specific text click required)
    const handleHeaderClick = () => {
        if (!currentConversation) return

        if (!isGroup && currentConversation.friendId) {
            fetchProfile(currentConversation.friendId)
        }
    }

    // --- Handler: Member Click in Group Modal ---
    const handleGroupMemberClick = (uid: string) => {
        setShowGroupModal(false) // Close list
        fetchProfile(uid) // Open profile
    }

    return (
        <div className="flex flex-col h-full bg-background relative">

            {/* --- Chat Header --- */}
            {/* Hidden on Mobile because layout handles it there */}
            <div
                className="hidden md:flex p-4 border-b items-center gap-3 bg-card shadow-sm z-10 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleHeaderClick}
            >
                {/* Avatar Display */}
                <div className="relative">
                    {currentConversation?.friendPhoto ? (
                        <img
                            src={currentConversation.friendPhoto}
                            alt={currentConversation.friendName}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {currentConversation?.friendName?.[0] || '?'}
                        </div>
                    )}
                </div>

                {/* Name & Status */}
                <div>
                    <h2 className="font-semibold text-base flex items-center gap-2">
                        {currentConversation?.friendName || 'Unknown User'}
                    </h2>

                    {/* Subtitle: "Click to view members" or "Click to view profile" */}
                    {isGroup ? (
                        <p
                            onClick={(e) => {
                                e.stopPropagation() // Prevent header click bubbling
                                fetchGroupMembers(currentConversation.id)
                            }}
                            className="text-xs text-muted-foreground hover:text-primary cursor-pointer"
                        >
                            Click to view members
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">Click to view profile</p>
                    )}

                    {/* Typing Indicator Display */}
                    {typingMessage && <p className="text-xs text-primary animate-pulse font-medium">{typingMessage}</p>}
                </div>
            </div>

            {/* --- Messages Logic --- */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg: any, index) => {
                    const isMe = msg.sender_id === email

                    // Show timestamp if first message or 5 mins gap
                    const showTime = index === 0 || (msg.timestamp - messages[index - 1].timestamp > 300000)

                    // Show Sender Name if: Group Chat + Not Me + (First msg OR Sender changed)
                    const showName = isGroup && !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id)

                    return (
                        <div key={msg.id || index} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>

                            {/* Timestamp Separator */}
                            {showTime && (
                                <div className="text-[10px] text-muted-foreground my-2 text-center w-full">
                                    {format(msg.timestamp, "MMM d, h:mm a")}
                                </div>
                            )}

                            {/* Group Chat: Sender Info */}
                            {showName && (
                                <div className="ml-4 mb-1 flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => fetchProfile(msg.sender_id)}>
                                    {/* Small Avatar */}
                                    {(msg.senderPhoto || msg.sender?.photos?.[0] || msg.sender?.visuals?.photos?.[0]) ? (
                                        <img
                                            src={msg.senderPhoto || msg.sender?.photos?.[0] || msg.sender?.visuals?.photos?.[0]}
                                            alt=""
                                            className="w-4 h-4 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                            {(msg.senderName || msg.sender?.first_name || '?')[0]}
                                        </div>
                                    )}
                                    <span className="text-[10px] text-muted-foreground hover:underline">
                                        {msg.senderName || `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`}
                                    </span>
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-muted text-foreground rounded-bl-none"
                                    }`}
                            >
                                {/* Attachment Rendering */}
                                {msg.attachment_url && (
                                    <div className="mb-2">
                                        {msg.attachment_type === 'image' ? (
                                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                                <img
                                                    src={msg.attachment_url}
                                                    alt="attachment"
                                                    className="rounded-lg max-h-60 object-cover hover:opacity-90 transition-opacity"
                                                />
                                            </a>
                                        ) : (
                                            <a
                                                href={msg.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-primary-foreground/10' : 'bg-background/50'} hover:bg-black/5 transition-colors`}
                                            >
                                                <div className="bg-background/20 p-2 rounded">
                                                    <span className="text-xl">📎</span>
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-semibold truncate max-w-[150px]">{msg.file_name || 'Attachment'}</span>
                                                    <span className="text-xs opacity-70">
                                                        {msg.file_size ? `${(msg.file_size / 1024).toFixed(1)} KB` : 'File'}
                                                    </span>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Text Content */}
                                {msg.content}
                            </div>
                        </div>
                    )
                })}
                {/* Scroll Anchor */}
                <div ref={scrollRef} />
            </div>

            {/* --- Modals Render --- */}
            <AnimatePresence>
                {showProfileModal && selectedMemberProfile && (
                    <ProfileDetailModal
                        profile={selectedMemberProfile}
                        onClose={() => setShowProfileModal(false)}
                    />
                )}
                {showGroupModal && (
                    <GroupMembersModal
                        members={groupMembers}
                        onClose={() => setShowGroupModal(false)}
                        onMemberClick={handleGroupMemberClick}
                        title={currentConversation?.friendName}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
