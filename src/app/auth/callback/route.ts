import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const cookieStore = request.cookies;
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // Note: This is a route handler, so we can't set cookies directly on the request object.
                        // But we need to pass these options to the response.
                        // The supabase-ssr package handles the response modification typically via middleware or by returning a response.
                        // IN THIS CASE: We just need to exchange code for session.
                    },
                    remove(name: string, options: CookieOptions) {
                    },
                },
            }
        );

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // FORGOT PASSWORD FLOW: 
            // When user clicks "Reset Password", the code logs them in.
            // We then redirect them to the "Update Password" page.
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
