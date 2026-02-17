"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/forms/OnboardingWizard";

export default function OnboardingPage() {
    const router = useRouter();
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const storedEmail = localStorage.getItem("user_email");
        if (!storedEmail) {
            router.push("/login");
            return;
        }
        setEmail(storedEmail);
    }, [router]);

    if (!email) return null;

    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-pink-500/10 via-background to-background" />
            <div className="w-full max-w-2xl">
                <OnboardingWizard email={email} />
            </div>
        </main>
    )
}
