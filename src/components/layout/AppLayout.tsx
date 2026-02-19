"use client"

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Users, Flame, MessageSquare, Heart, User as UserIcon, Sun, Moon, Check, X, Trophy } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { MatchRequestsSidebar } from "@/components/social/MatchRequestsSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useRealtime } from "@/context/RealtimeContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isChatOpen = pathname === '/main/chat' && !!searchParams.get('chatId');
    const { theme, toggleTheme } = useTheme();
    const { badges, clearLikesBadge, clearChatsBadge } = useRealtime();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    // Clear badge when user visits the page
    useEffect(() => {
        if (pathname.startsWith('/main/likes')) clearLikesBadge();
        if (pathname.startsWith('/main/chats') || pathname.startsWith('/main/chat')) clearChatsBadge();
    }, [pathname, clearLikesBadge, clearChatsBadge]);


    const navItems = [
        { href: "/main/people", icon: Users, label: "People", count: 0 },
        { href: "/main/discover", icon: Flame, label: "Discover", count: 0 },
        { href: "/main/likes", icon: Heart, label: "Likes", count: badges.likes },
        { href: "/main/chat", icon: MessageSquare, label: "Messages", count: badges.chats },
        { href: "/main/leaderboard", icon: Trophy, label: "Rank", count: 0 },
        { href: "/main/profile", icon: UserIcon, label: "Profile", count: 0 },
    ];



    return (
        <>
            {/* ==========================================
                DESKTOP LAYOUT (lg and above: ≥1024px)
               ========================================== */}
            <div className="hidden lg:flex h-screen w-full bg-background">

                {/* Left Sidebar Navigation */}
                <aside
                    onMouseEnter={() => setSidebarExpanded(true)}
                    onMouseLeave={() => setSidebarExpanded(false)}
                    className={cn(
                        "h-full border-r bg-background flex flex-col py-6 transition-all duration-300 ease-in-out shrink-0 z-20",
                        sidebarExpanded ? "w-56" : "w-[72px]"
                    )}
                >
                    {/* Logo */}
                    <div className="px-4 mb-8">
                        <Link href="/main/discover" className="flex items-center gap-3 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/logo_icon.png"
                                alt="SkillLinkr Logo"
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-lg object-cover shrink-0"
                            />
                            <span className={cn(
                                "font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500 whitespace-nowrap transition-all duration-300",
                                sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                            )}>
                                SkillLinkr
                            </span>
                        </Link>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 flex flex-col gap-1 px-3">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                        isActive
                                            ? "text-foreground font-bold bg-muted"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <Icon className={cn("h-6 w-6", isActive && "fill-current")} />
                                        {item.count > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center">
                                                {item.count > 99 ? '99+' : item.count}
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-sm whitespace-nowrap transition-all duration-300",
                                        sidebarExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom: Notifications + Theme Toggle */}
                    <div className="px-3 mt-4 space-y-2">
                        {/* Notifications (Desktop Sidebar) */}
                        <div className={cn(
                            "flex items-center px-3 py-2 text-muted-foreground hover:text-foreground transition-all duration-200",
                            sidebarExpanded ? "justify-start gap-4" : "justify-center"
                        )}>
                            <NotificationBell />
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-all duration-300 cursor-default",
                                sidebarExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                            )}>
                                Notifications
                            </span>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-4 px-3 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 w-full"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-6 w-6 shrink-0" />
                            ) : (
                                <Moon className="h-6 w-6 shrink-0" />
                            )}
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-all duration-300",
                                sidebarExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                            )}>
                                {theme === "dark" ? "Light Mode" : "Dark Mode"}
                            </span>
                        </button>
                    </div>
                </aside>

                {/* Center Content Area */}
                <main className={cn(
                    "flex-1 h-full overflow-y-auto overflow-x-hidden",
                    pathname.startsWith('/main/likes') ? "border-r max-w-2xl" : ""
                )}>
                    {children}
                </main>

                {/* Right Sidebar — Match Requests (Only on Likes page) */}
                {pathname.startsWith('/main/likes') && (
                    <aside className="w-[480px] h-full shrink-0 border-l bg-background hidden xl:block z-10">
                        <MatchRequestsSidebar />
                    </aside>
                )}
            </div>

            {/* ==========================================
                MOBILE LAYOUT (below lg: < 1024px)
               ========================================== */}
            <div className="lg:hidden flex flex-col h-screen max-w-md mx-auto bg-background shadow-2xl relative overflow-hidden ring-1 ring-border/10">

                {/* Top Bar */}
                <header className={cn(
                    "h-24 pt-12 pb-4 px-4 items-center justify-center border-b bg-background/80 backdrop-blur-md z-10 sticky top-0 relative",
                    isChatOpen ? "hidden md:flex" : "flex"
                )}>
                    <div className="absolute left-4 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.png"
                            alt="SkillLinkr Logo"
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-lg object-cover"
                        />
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
                            SkillLinkr
                        </span>
                    </div>
                    <div className="absolute right-4 flex items-center gap-3">
                        {/* Notifications (Mobile Header) */}
                        <NotificationBell />

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-muted transition-all duration-300 text-muted-foreground hover:text-foreground"
                            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
                            ) : (
                                <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
                            )}
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
                    {children}
                </main>

                {/* Bottom Navigation */}
                <nav className={cn(
                    "h-28 border-t bg-background/80 backdrop-blur-md pb-12 pt-4 px-6 items-center justify-between z-10",
                    isChatOpen ? "hidden md:flex" : "flex"
                )}>
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 transition-all duration-300 relative",
                                    isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/70"
                                )}
                            >
                                <div className="relative">
                                    <Icon className={cn("h-6 w-6", isActive && "fill-current")} />
                                    {item.count > 0 && (
                                        <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-sm">
                                            {item.count > 99 ? '99+' : item.count}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div >
        </>
    );
}
