"use client"

import { SignupForm } from "@/components/auth/SignupForm";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function SignupPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-background to-background" />

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-all duration-300 text-muted-foreground hover:text-foreground"
                aria-label="Toggle theme"
            >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <SignupForm />
        </main>
    );
}
