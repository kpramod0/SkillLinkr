import { Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DiscoveryProvider } from "@/context/DiscoveryContext";
import { NotificationManager } from "@/components/logic/NotificationManager";
import { Loader2 } from "lucide-react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <DiscoveryProvider>
            <Suspense fallback={
                <div className="flex h-screen w-full items-center justify-center bg-background">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            }>
                <AppLayout>
                    <NotificationManager />
                    {children}
                </AppLayout>
            </Suspense>
        </DiscoveryProvider>
    );
}
