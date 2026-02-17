import { ChatWindow } from "@/components/social/ChatWindow";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <div className="h-[calc(100vh-144px)]"> {/* Adjust height for layout */}
            <ChatWindow matchId={id} />
        </div>
    );
}
