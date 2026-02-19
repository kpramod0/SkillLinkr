
"use client";

import { ThemeProvider } from "@/context/ThemeContext";
import { ChatProvider } from "@/context/ChatContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { RealtimeProvider } from "@/context/RealtimeContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <RealtimeProvider>
                    <ChatProvider>
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </ChatProvider>
                </RealtimeProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
