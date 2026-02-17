import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function DashboardPage() {
    // In a real app, we would verify the session/cookie here.

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden text-center">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-500/20 via-background to-background" />

            <div className="w-full max-w-md p-8 glass rounded-2xl flex flex-col items-center space-y-6">
                <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>

                <h1 className="text-3xl font-bold">Welcome Aboard!</h1>
                <p className="text-muted-foreground">
                    Your account has been successfully verified. You now have access to SkillLinkr.
                </p>

                <Link href="/" className="w-full">
                    <Button className="w-full" variant="outline">Back to Home</Button>
                </Link>
            </div>
        </main>
    );
}
