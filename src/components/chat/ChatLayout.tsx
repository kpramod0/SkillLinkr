
"use client"

import { useChat } from "@/context/ChatContext"
import { ChatList } from "./ChatList"
import { ChatWindow } from "./ChatWindow"
import { ChatInput } from "./ChatInput"
import { ChevronLeft } from "lucide-react"

export function ChatLayout() {
    const { selectedConversationId, selectConversation, conversations } = useChat()

    // Find active conversation details
    const activeConv = conversations.find(c => c.id === selectedConversationId)

    return (
        <div className="flex h-full w-full overflow-hidden bg-background md:rounded-2xl md:border md:shadow-sm">

            {/* Sidebar (List) - Hidden on mobile if chat is open */}
            <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r bg-card flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                <ChatList />
            </div>

            {/* Main Chat Area - Hidden on mobile if no chat selected */}
            <div className={`flex-1 flex-col bg-background/50 relative ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>

                {/* Mobile Back Button Header — sticky so it never scrolls away */}
                {selectedConversationId && (
                    <div className="md:hidden sticky top-0 z-30 flex items-center p-3 border-b bg-card/95 backdrop-blur-md">
                        <button
                            onClick={() => selectConversation(null as any, null as any, undefined)}
                            className="p-2 -ml-2 hover:bg-muted rounded-full mr-2"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>

                        {activeConv ? (
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                                    {activeConv.friendPhoto ? (
                                        <img src={activeConv.friendPhoto} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-sm">
                                            {activeConv.friendName?.[0] || '?'}
                                        </div>
                                    )}
                                </div>
                                <span className="font-bold text-base truncate">{activeConv.friendName}</span>
                            </div>
                        ) : (
                            <span className="font-bold text-lg">Chat</span>
                        )}
                    </div>
                )}

                {/* Chat Area Wrapper - Takes remaining space and allows internal scroll */}
                <div className="flex-1 min-h-0 overflow-hidden w-full">
                    <ChatWindow />
                </div>

                {/* Input Area - Fixed height (sized by content) */}
                <div className="flex-shrink-0 w-full bg-background z-20">
                    <ChatInput />
                </div>
            </div>
        </div>
    )
}
