import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/"

    console.log("Auth Callback Hit")
    console.log("Code Present:", !!code)
    console.log("Target Next URL:", next)

    if (code) {
        const cookieStore = request.cookies
        // ... (existing cookie setup)

        // Create the response object first so we can modify its cookies
        const response = NextResponse.redirect(`${origin}${next}`)

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // Updated: correctly set cookies on the response object
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        // Updated: correctly remove cookies from the response object
                        response.cookies.set({
                            name,
                            value: "",
                            ...options,
                        })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error("Auth Exchange Error:", error.message)
            return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`)
        }

        if (!error) {
            console.log("Auth Success! Redirecting to:", `${origin}${next}`)
            // Return the response which now has the session cookies set
            return response
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
