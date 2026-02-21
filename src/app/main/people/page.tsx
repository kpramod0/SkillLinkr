"use client"

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/types";
import { ProfileDetailModal } from "@/components/social/ProfileDetailModal";
import { AnimatePresence } from "framer-motion";
import { useDiscovery } from "@/context/DiscoveryContext";

import { FilterDialog } from "@/components/social/FilterDialog";

export default function PeoplePage() {
    const { filters, blockedIds } = useDiscovery();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

    const [activeTab, setActiveTab] = useState<'connections' | 'starred'>('connections');
    const [people, setPeople] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchPeople = async () => {
            setIsLoading(true);
            try {
                const email = localStorage.getItem("user_email");
                if (!email) return;

                const params = new URLSearchParams();
                params.set('userId', email);
                if (debouncedSearch) params.set('q', debouncedSearch);

                if (activeTab !== 'starred') {
                    if (filters.genders && filters.genders.length > 0 && !filters.genders.includes('Any')) {
                        params.set('genders', filters.genders.join(','));
                    }
                    if (filters.years && filters.years.length > 0) {
                        params.set('years', filters.years.join(','));
                    }
                    if (filters.domains && filters.domains.length > 0) {
                        params.set('domains', filters.domains.join(','));
                    }
                }

                const endpoint = activeTab === 'connections'
                    ? `/api/matches?${params.toString()}`
                    : `/api/starred?${params.toString()}`;

                const res = await fetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    setPeople(data);
                }
            } catch (error) {
                console.error("Failed to fetch people:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPeople();
    }, [activeTab, debouncedSearch, filters]);

    // Simple client-side safety filter for blocked users (though API should handle it)
    const filteredPeople = people.filter(person => !blockedIds.has(person.id));

    return (
        <div className="p-4 space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Community</h1>
                <FilterDialog />
            </div>

            {/* Pill Toggle Switch */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 w-fit mx-auto">
                <button
                    onClick={() => setActiveTab('connections')}
                    className={`px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${activeTab === 'connections'
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    CONNECTIONS
                </button>
                <button
                    onClick={() => setActiveTab('starred')}
                    className={`px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${activeTab === 'starred'
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    STARRED
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, skill, or year..."
                    className="pl-9 bg-muted/50 border-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading...</div>
                ) : filteredPeople.length > 0 ? (
                    filteredPeople.map(person => (
                        <div
                            key={person.id}
                            onClick={() => setSelectedProfile(person)}
                            className="flex items-center gap-4 p-3 bg-card rounded-xl border hover:border-emerald-500/50 transition-colors cursor-pointer"
                        >
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0">
                                {person.personal.firstName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">
                                    {person.personal.firstName} {person.personal.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {person.professionalDetails.year} Year • {person.professionalDetails.domains.join(", ")}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        {searchQuery
                            ? `No results found for "${searchQuery}"`
                            : activeTab === 'connections'
                                ? "No connections yet. Go swipe!"
                                : "No starred profiles yet."}
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
    );
}
