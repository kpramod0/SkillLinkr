import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export default function UpdatePasswordPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-cyan-500/20 via-background to-background" />
            <UpdatePasswordForm />
        </main>
    );
}
