
"use client";

import { ThemeProvider } from "@/context/ThemeContext";
import { ChatProvider } from "@/context/ChatContext";

import { ToastProvider } from "@/context/ToastContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <ChatProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </ChatProvider>
        </ThemeProvider>
    );
}
