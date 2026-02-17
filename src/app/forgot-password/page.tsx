import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-background to-background" />
            <ForgotPasswordForm />
        </main>
    );
}
