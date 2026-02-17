"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

type ToastType = {
    id: string
    title?: string
    description?: string
    variant?: "default" | "destructive" | "success"
}

type ToastContextType = {
    toast: (props: Omit<ToastType, "id">) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastType[]>([])

    const toast = useCallback(({ title, description, variant = "default" }: Omit<ToastType, "id">) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prev) => [...prev, { id, title, description, variant }])

        // Auto dismiss
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none p-4">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            layout
                            className={`
                                pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md
                                ${t.variant === 'destructive' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' :
                                    t.variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                        'bg-background/80 border-border text-foreground'}
                            `}
                        >
                            <div className="mt-0.5">
                                {t.variant === 'destructive' && <AlertCircle className="h-5 w-5" />}
                                {t.variant === 'success' && <CheckCircle className="h-5 w-5" />}
                                {t.variant === 'default' && <Info className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                                {t.title && <h4 className="font-semibold text-sm">{t.title}</h4>}
                                {t.description && <p className="text-xs opacity-90">{t.description}</p>}
                            </div>
                            <button onClick={() => removeToast(t.id)} className="text-foreground/50 hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}
