import { SwipeDeck } from "@/components/social/SwipeDeck";
import { FilterDialog } from "@/components/social/FilterDialog";

export default function DiscoverPage() {
    return (
        <div className="h-full flex flex-col bg-muted/20">
            {/* Desktop-only header — hidden on mobile to give max space to card */}
            <div className="hidden lg:flex items-center justify-between px-4 pt-4 pb-2">
                <h1 className="text-2xl font-bold">Discover</h1>
                <FilterDialog />
            </div>
            <div className="flex-1 overflow-hidden">
                <SwipeDeck />
            </div>
        </div>
    );
}
