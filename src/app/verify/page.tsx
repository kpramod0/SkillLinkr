import { Suspense } from 'react';
import { VerifyForm } from "@/components/auth/VerifyForm";
import { Loader2 } from "lucide-react";

export default function VerifyPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-background to-background" />
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-emerald-500" />}>
                <VerifyForm />
            </Suspense>
        </main>
    );
}
