"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Send, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface TeamApplicationModalProps {
    team: any // Type this properly later
    onConfirm: (message: string) => void
    onCancel: () => void
}

export function TeamApplicationModal({ team, onConfirm, onCancel }: TeamApplicationModalProps) {
    const [message, setMessage] = useState(`Hey! I saw you're looking for a ${team.roles_needed[0] || 'member'}. I'd love to join!`)

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-background w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden z-10"
            >
                {/* Header */}
                <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">Apply to Join</h3>
                        <p className="text-xs text-muted-foreground">Send a quick pitch to the team lead</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-8 w-8 hover:bg-muted">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="text-xs font-semibold text-primary uppercase mb-1">Applying for</div>
                        <div className="font-medium text-sm">{team.title}</div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Your Message</label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="text-sm min-h-[100px] resize-none focus-visible:ring-indigo-500"
                            placeholder="Why are you a good fit?"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/20 flex gap-3">
                    <Button variant="outline" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={() => onConfirm(message)} className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition-opacity">
                        <Send className="h-4 w-4" />
                        Send Request
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
