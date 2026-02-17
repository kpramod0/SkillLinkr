"use client"

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sun, Moon } from "lucide-react";
import { ClientAuthCheck } from "@/components/logic/ClientAuthCheck";
import { useTheme } from "@/context/ThemeContext";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-background to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-all duration-300 text-muted-foreground hover:text-foreground z-50"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      </button>

      <ClientAuthCheck />
      <div className="text-center space-y-6 max-w-2xl z-10">
        <div className="inline-block glass px-4 py-1.5 rounded-full text-sm font-medium text-emerald-500 mb-4 border-emerald-500/20">
          Exclusive to KIIT Students
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50 text-center">
          SkillLinkr: Where Skills Meet Opportunity.
        </h1>

        <p className="text-xl text-muted-foreground leading-relaxed">
          Swipe through developers, designers, and innovators.
          Match instantly and start building today.
        </p>

        <div className="flex gap-4 justify-center pt-8">
          <Link href="/signup">
            <Button size="lg" className="rounded-full px-8 text-lg h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-xl shadow-emerald-500/20">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="rounded-full px-8 text-lg h-12 bg-transparent border-white/20 hover:bg-white/5">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
