"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react"
import { createClient, RealtimeChannel } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

// --- Supabase Initialization ---
// Initialize client with environment variables for Realtime and Auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// --- Types & Interfaces ---

/**
 * Message Structure
 * - id: UUID or 'temp_' prefix for optimistic updates
 * - team_id: Present if it's a group message
 * - receiver_id: Present if it's a DM
 */
type Message = {
    id: string
    sender_id: string
    receiver_id: string | null
    team_id?: string
    content: string

    // Media support
    attachment_url?: string
    attachment_type?: "image" | "video" | "file" | "link"
    file_name?: string
    file_size?: number

    timestamp: number
    created_at?: string

    // Enriched sender info for UI display
    senderName?: string
    senderPhoto?: string
    sender?: {
        first_name?: string
        last_name?: string
        photos?: string[]
        visuals?: { photos?: string[] }
    }
}

/**
 * Conversation Structure
 * Represents a chat thread in the sidebar.
 * - type: 'direct' (1-on-1) or 'group' (Team chat)
 * - id: 'dm_userId' or 'team_teamId'
 */
type Conversation = {
    id: string
    dbId?: number // Internal DB ID for operations
    type: "direct" | "group"
    friendId: string | null // Target user ID for DMs
    friendName: string // Display name (User name or Team name)
    friendPhoto?: string | null
    lastMessage?: string
    lastMessageAt?: string
    unreadCount?: number
}

/**
 * ChatContext Interface
 * Exposes state and methods to the rest of the app.
 */
interface ChatContextType {
    // Data
    conversations: Conversation[]
    messages: Message[]
    selectedConversationId: string | null
    userId: string | null
    isLoading: boolean
    typingUsers: Set<string> // IDs of users currently typing

    // Actions
    selectConversation: (id: string | null, friendId: string | null, type?: "direct" | "group") => void
    sendMessage: (
        content: string,
        type?: "text" | "image" | "video" | "file",
        attachmentUrl?: string,
        fileDetails?: { fileName?: string; fileSize?: number }
    ) => Promise<void>
    refreshConversations: () => Promise<void>
    openChatWith: (friendId: string) => Promise<void>
    sendTypingEvent: (isTyping: boolean) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

/**
 * ChatProvider Component
 * 
 * Wraps the application to provide global chat state and methods.
 * Handles:
 * 1. fetching conversations
 * 2. managing real-time subscriptions
 * 3. sending messages
 * 4. typing indicators
 */
export function ChatProvider({ children }: { children: ReactNode }) {
    // --- Local State ---
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [messages, setMessages] = useState<Message[]>([])

    // Selection state
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
    const [conversationType, setConversationType] = useState<"direct" | "group">("direct")

    // Status state
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)

    // Typing state
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
    const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    // Refs for event handlers (to avoid stale closures in subscriptions)
    const selectedFriendIdRef = useRef<string | null>(null)
    const selectedConversationIdRef = useRef<string | null>(null)
    const conversationTypeRef = useRef<"direct" | "group">("direct")

    // Sync refs with state
    useEffect(() => {
        selectedFriendIdRef.current = selectedFriendId
        selectedConversationIdRef.current = selectedConversationId
        conversationTypeRef.current = conversationType
    }, [selectedFriendId, selectedConversationId, conversationType])

    // --- Helper: Get Auth Headers ---
    // Retrieves current session token for API requests
    const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    // --- Fetch Conversations ---
    // Loads the list of active chats (both DMs and Groups)
    const fetchConversations = useCallback(async (uid: string) => {
        try {
            const headers = await getAuthHeaders()
            const res = await fetch(`/api/conversations?userId=${uid}`, { headers })
            if (res.ok) {
                const data = await res.json()
                setConversations(data)
                // Persist for instant load next time
                sessionStorage.setItem(`convs_${uid}`, JSON.stringify(data))
            }
        } catch (error) {
            console.error("Failed to fetch conversations", error)
        } finally {
            setIsLoading(false)
        }
    }, [getAuthHeaders])

    // --- Initialization ---
    // Identify user from Supabase Session and load initial data
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) {
                const uid = session.user.email
                setUserId(uid)

                // 1. Try to load from cache immediately
                const cached = sessionStorage.getItem(`convs_${uid}`)
                if (cached) {
                    try {
                        setConversations(JSON.parse(cached))
                        setIsLoading(false) // Ready to display cached data
                    } catch (e) { }
                }

                // 2. Fetch fresh data in background
                fetchConversations(uid)
            } else {
                setIsLoading(false)
            }
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.email) {
                const uid = session.user.email
                setUserId(uid)
                fetchConversations(uid)
            } else {
                setUserId(null)
                setConversations([])
                setMessages([])
                setIsLoading(false)
                sessionStorage.clear()
            }
        })

        return () => subscription.unsubscribe()
    }, [fetchConversations])

    // --- Throttled Refresh ---
    // Prevents spamming the API during rapid updates (e.g. typing)
    const lastRefreshRef = useRef(0)
    const refreshConversationsThrottled = useCallback(() => {
        if (!userId) return
        const now = Date.now()
        if (now - lastRefreshRef.current < 1200) return
        lastRefreshRef.current = now
        fetchConversations(userId)
    }, [userId, fetchConversations])

    // --- Typing events (works for DM + Group) ---
    // --- Typing Indicators (Broadcast) ---
    // Uses Supabase Broadcast channels to share typing status without database persistence
    const activeTypingChannelRef = useRef<RealtimeChannel | null>(null)

    // Subscribe to typing events for the active conversation
    useEffect(() => {
        if (!selectedConversationId) return

        // Cleanup previous channel
        if (activeTypingChannelRef.current) {
            supabase.removeChannel(activeTypingChannelRef.current)
            activeTypingChannelRef.current = null
        }

        // Subscribe to new channel
        const channel = supabase
            .channel(`active_chat_${selectedConversationId}`)
            .on("broadcast", { event: "typing" }, (payload) => {
                handleTypingEvent(payload.payload)
            })
            .subscribe()

        activeTypingChannelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
            activeTypingChannelRef.current = null
        }
    }, [selectedConversationId])

    // Process incoming typing event
    const handleTypingEvent = (payload: { userId: string; isTyping: boolean }) => {
        // Ignore my own events
        if (payload.userId === userId) return

        setTypingUsers((prev) => {
            const next = new Set(prev)

            if (payload.isTyping) {
                next.add(payload.userId)

                // Clear existing timeout to reset the timer
                if (typingTimeoutRef.current[payload.userId]) {
                    clearTimeout(typingTimeoutRef.current[payload.userId])
                }

                // Auto-remove typing status after 3 seconds of inactivity
                typingTimeoutRef.current[payload.userId] = setTimeout(() => {
                    setTypingUsers((current) => {
                        const updated = new Set(current)
                        updated.delete(payload.userId)
                        return updated
                    })
                }, 3000)
            } else {
                next.delete(payload.userId)
                if (typingTimeoutRef.current[payload.userId]) {
                    clearTimeout(typingTimeoutRef.current[payload.userId])
                }
            }
            return next
        })
    }

    // Send my typing status to others
    const sendTypingEvent = async (isTyping: boolean) => {
        if (!selectedConversationId || !userId) return
        const channel = activeTypingChannelRef.current
        if (!channel) return

        await channel.send({
            type: "broadcast",
            event: "typing",
            payload: { userId, isTyping },
        })
    }

    // --- Message Reconciliation Strategy ---
    // Replaces temporary "optimistic" messages with confirmed server messages
    // This prevents message duplication and ensures UI reflects the database state
    const reconcileOptimistic = (prev: Message[], incoming: Message) => {
        // 1. If we already have this exact message ID, ignore it
        if (prev.some((m) => m.id === incoming.id)) return prev

        // 2. If message is from me, check if it matches a pending temp message
        if (incoming.sender_id === userId) {
            const convType = conversationTypeRef.current
            const currentFriend = selectedFriendIdRef.current
            const currentConv = selectedConversationIdRef.current

            const tempIndex = prev.findIndex((m) => {
                // Must be a temp message from me
                if (!m.id?.startsWith("temp_")) return false
                if (m.sender_id !== userId) return false
                // Content must match
                if (m.content !== incoming.content) return false
                // Timestamp must be close (within 5s)
                if (Math.abs((m.timestamp || 0) - (incoming.timestamp || 0)) > 5000) return false

                // Context match (Group vs DM)
                if (convType === "group") {
                    const teamId = currentConv?.split("_")[1]
                    return teamId && String(incoming.team_id) === String(teamId)
                } else {
                    return currentFriend && incoming.receiver_id === currentFriend
                }
            })

            // If found, replace temp message with server message in-place
            if (tempIndex !== -1) {
                const copy = [...prev]
                copy[tempIndex] = { ...copy[tempIndex], ...incoming }
                return copy
            }
        }

        // 3. Otherwise, it's a new message, just append it
        return [...prev, incoming]
    }

    // --- New Message Handler ---
    // Decides if an incoming real-time message belongs to the current open chat
    const handleNewMessage = (newMessage: Message) => {
        // Always refresh the sidebar list (unread counts, last message)
        refreshConversationsThrottled()

        const currentType = conversationTypeRef.current
        const currentFriendId = selectedFriendIdRef.current
        const currentConvId = selectedConversationIdRef.current
        if (!currentConvId || !userId) return

        let isForCurrentChat = false

        if (currentType === "direct") {
            // Check bidirectional match for DM
            if (newMessage.sender_id === currentFriendId && newMessage.receiver_id === userId) isForCurrentChat = true
            if (newMessage.sender_id === userId && newMessage.receiver_id === currentFriendId) isForCurrentChat = true
        } else {
            // Check team ID match for Group
            const msgTeamId = (newMessage as any).team_id
            if (msgTeamId && currentConvId === `team_${msgTeamId}`) isForCurrentChat = true
        }

        // Only update message list if the user is looking at this chat
        if (!isForCurrentChat) return

        setMessages((prev) => reconcileOptimistic(prev, newMessage))
    }

    // --- Privacy-Safe Realtime Subscriptions ---
    // Instead of listening to all messages (which RLS blocks), we listen to specific channels
    // tied to the user's ID or their team IDs.
    const dmInRef = useRef<RealtimeChannel | null>(null)
    const dmOutRef = useRef<RealtimeChannel | null>(null)
    const teamMemberRef = useRef<RealtimeChannel | null>(null)
    const teamMsgChannelsRef = useRef<RealtimeChannel[]>([])
    const teamIdsKeyRef = useRef<string>("")

    // 1. Subscribe to Personal DMs (Incoming + Outgoing)
    useEffect(() => {
        if (!userId) return

        // Cleanup
        if (dmInRef.current) supabase.removeChannel(dmInRef.current)
        if (dmOutRef.current) supabase.removeChannel(dmOutRef.current)

        // Incoming DMs: Listen for rows where receiver_id == me
        dmInRef.current = supabase
            .channel(`dm_in_${userId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` }, (payload) => {
                handleNewMessage(payload.new as Message)
            })
            .subscribe()

        // Outgoing DMs (for specific multi-window sync): Listen for rows where sender_id == me
        // Note: We filter out group messages here to avoid double-handling
        dmOutRef.current = supabase
            .channel(`dm_out_${userId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${userId}` }, (payload) => {
                const msg = payload.new as any
                if (msg.team_id) return // Group messages handled by team channels
                handleNewMessage(msg as Message)
            })
            .subscribe()

        return () => {
            if (dmInRef.current) supabase.removeChannel(dmInRef.current)
            if (dmOutRef.current) supabase.removeChannel(dmOutRef.current)
            dmInRef.current = null
            dmOutRef.current = null
        }
    }, [userId])

    // 2. Subscribe to Team Membership Changes AND New Matches (DMs)
    // Ensures that when I get added to a team OR get a new match, the chat appears instantly
    useEffect(() => {
        if (!userId) return

        if (teamMemberRef.current) supabase.removeChannel(teamMemberRef.current)

        // A. Team Membership
        teamMemberRef.current = supabase
            .channel(`team_members_${userId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_members", filter: `user_id=eq.${userId}` }, () => {
                fetchConversations(userId)
            })
            // B. New Matches (where I am user1)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches", filter: `user1_id=eq.${userId}` }, () => {
                fetchConversations(userId)
            })
            // C. New Matches (where I am user2)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches", filter: `user2_id=eq.${userId}` }, () => {
                fetchConversations(userId)
            })
            .subscribe()

        return () => {
            if (teamMemberRef.current) supabase.removeChannel(teamMemberRef.current)
            teamMemberRef.current = null
        }
    }, [userId, fetchConversations])

    // 3. Subscribe to Group Messages (Per Team)
    // We create a separate listener for EACH team I belong to.
    useEffect(() => {
        if (!userId) return

        // Extract team IDs from conversation list
        const teamIds = (conversations || [])
            .filter((c) => c.type === "group")
            .map((c) => String(c.dbId ?? c.id.split("_")[1]))
            .filter(Boolean)
            .sort()

        // Memoization check: Don't resubscribe if team list hasn't changed
        const key = teamIds.join(",")
        if (key === teamIdsKeyRef.current) return
        teamIdsKeyRef.current = key

        // Clear old channels
        teamMsgChannelsRef.current.forEach((ch) => supabase.removeChannel(ch))
        teamMsgChannelsRef.current = []

        // Create new subscriptions
        teamIds.forEach((tid) => {
            const ch = supabase
                .channel(`team_msgs_${tid}`)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `team_id=eq.${tid}` }, (payload) => {
                    handleNewMessage(payload.new as Message)
                })
                .subscribe()
            teamMsgChannelsRef.current.push(ch)
        })

        return () => {
            teamMsgChannelsRef.current.forEach((ch) => supabase.removeChannel(ch))
            teamMsgChannelsRef.current = []
        }
    }, [conversations, userId])

    // --- Select Conversation & Load History ---
    // Handles switching between chats, updating URL, and fetching message history
    const selectConversation = useCallback(
        async (id: string | null, friendId: string | null, type: "direct" | "group" = "direct") => {
            setSelectedConversationId(id)
            setSelectedFriendId(friendId)
            setConversationType(type)

            // Update URL for deep linking
            if (id) router.push(`/main/chat?chatId=${id}`)
            else router.push("/main/chat")

            if (!id || !userId) return

            try {
                // Construct API URL based on chat type
                let url = `/api/messages?userId=${userId}`
                if (type === "group") {
                    const dbId = id.split("_")[1]
                    url += `&teamId=${dbId}`
                } else {
                    if (friendId) url += `&targetId=${friendId}`
                }

                // Fetch history
                const headers = await getAuthHeaders()
                const res = await fetch(url, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setMessages(data)
                }
            } catch (error) {
                console.error("Failed to fetch messages", error)
            }
        },
        [userId, router, getAuthHeaders]
    )

    // --- Send Message ---
    // Handles text, image, video, and file messages.
    // Uses Optimistic UI to show message immediately before server confirmation.
    const sendMessage = async (
        content: string,
        type: "text" | "image" | "video" | "file" = "text",
        attachmentUrl?: string,
        fileDetails?: { fileName?: string; fileSize?: number }
    ) => {
        if (!userId || (!selectedFriendId && conversationType === "direct")) return

        // 1. Create Optimistic Message (Temp ID)
        const tempId = `temp_${Date.now()}`
        const tempTimestamp = Date.now()

        const tempMessage: any = {
            id: tempId,
            sender_id: userId,
            content,
            attachment_url: attachmentUrl,
            attachment_type: type,
            file_name: fileDetails?.fileName,
            file_size: fileDetails?.fileSize,
            timestamp: tempTimestamp,
            created_at: new Date().toISOString(),
        }

        // Set receiver/team ID
        if (conversationType === "direct" && selectedFriendId) tempMessage.receiver_id = selectedFriendId
        if (conversationType === "group" && selectedConversationId) tempMessage.team_id = selectedConversationId.split("_")[1]

        // Update UI immediately
        setMessages((prev) => [...prev, tempMessage])

        try {
            // 2. Prepare Payload
            const body: any = {
                senderId: userId,
                content,
                attachmentUrl,
                attachmentType: type,
                fileName: fileDetails?.fileName,
                fileSize: fileDetails?.fileSize,
            }

            if (conversationType === "group" && selectedConversationId) {
                body.teamId = selectedConversationId.split("_")[1]
            } else if (selectedFriendId) {
                body.receiverId = selectedFriendId
            }

            // 3. Send to API
            const headers = { "Content-Type": "application/json", ...(await getAuthHeaders()) }

            const res = await fetch("/api/messages", {
                method: "POST",
                headers: headers as HeadersInit,
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Failed to send")
            }

            // 4. Update with Real ID from Server
            const { id: serverId, timestamp: serverTs } = await res.json()

            // Find the temp message and update it
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, id: serverId, timestamp: serverTs ?? m.timestamp } : m))
            )

            // Refresh conversation list to show latest message snippet
            refreshConversationsThrottled()
        } catch (error) {
            console.error("Send failed", error)
            // TODO: Add visual error state for failed messages
        }
    }

    const refreshConversations = async () => {
        if (userId) await fetchConversations(userId)
    }

    // Opens a DM with a specific friend (used from Profile Modal)
    const openChatWith = async (friendId: string) => {
        if (!userId) return
        const conversation = conversations.find((c) => c.friendId === friendId && c.type === "direct")
        if (conversation) {
            selectConversation(conversation.id, conversation.friendId, "direct")
            router.push("/main/chat")
        } else {
            console.warn("Conversation not found. User might not be a match yet.")
        }
    }

    return (
        <ChatContext.Provider
            value={{
                conversations,
                messages,
                selectedConversationId,
                isLoading,
                selectConversation,
                sendMessage,
                refreshConversations,
                openChatWith,
                typingUsers,
                sendTypingEvent,
                userId,
            }}
        >
            {children}
        </ChatContext.Provider>
    )
}

export function useChat() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error("useChat must be used within a ChatProvider")
    }
    return context
}
