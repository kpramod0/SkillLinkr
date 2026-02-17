
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ChatPage() {
    return (
        <div className="h-full w-full p-0 md:p-6 lg:p-8 flex flex-col">
            <h1 className="text-2xl font-bold mb-4 hidden md:block">Real-Time Chat</h1>
            <ChatLayout />
        </div>
    );
}
