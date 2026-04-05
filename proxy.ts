import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password"]);

export default async function proxy(request: NextRequest) {
  // If env vars aren't configured, let all requests through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl.startsWith("http") || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update the request cookie jar so the refreshed tokens are visible
        // to any downstream server code that reads the same request
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Rebuild the response from the updated request so forwarded headers
        // include the new cookie values
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Validate the JWT with the Auth server.  This also refreshes expired access
  // tokens using the stored refresh token, writing the new cookies via setAll.
  // We wrap in try/catch so a transient network error never crashes the proxy.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth server unreachable — fall through with user = null.
    // The client-side AuthGate will re-check and redirect if needed.
  }

  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  // ── Unauthenticated → /login ───────────────────────────────────────────────
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname === "/" ? "" : pathname);
    if (!url.searchParams.get("next")) url.searchParams.delete("next");

    const redirectResponse = NextResponse.redirect(url);
    // Forward any refreshed-token cookies so the browser stays in sync
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
      redirectResponse.cookies.set(name, value, opts);
    });
    return redirectResponse;
  }

  // ── Authenticated + auth route → dashboard ────────────────────────────────
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");

    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
      redirectResponse.cookies.set(name, value, opts);
    });
    return redirectResponse;
  }

  // Always return the supabaseResponse — it carries any refreshed session cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, and Supabase
    // auth callback routes that need to complete without redirection
    "/((?!_next/static|_next/image|favicon\\.ico|auth/callback|auth/reset-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
