import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password"]);

// Elk los portaal (admin, practice) heeft een eigen inlogscherm, los van het
// patiënten-inlogscherm — zie docs/REVA-V2-MASTERPLAN.md §16. Voegt een
// nieuw portaal er later eentje toe? Dan hoeft alleen deze lijst te groeien.
const PORTALS = [
  { prefix: "/admin", loginRoute: "/admin/login" },
  { prefix: "/portal", loginRoute: "/portal/login" },
];

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

  const redirectTo = (path: string, extra?: (url: URL) => void) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    extra?.(url);
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
      redirectResponse.cookies.set(name, value, opts);
    });
    return redirectResponse;
  };

  // Normaliseer trailing slash — anders matcht "/login/" nooit met AUTH_ROUTES
  // (Next normaliseert intern soms naar een trailing slash) en loopt de
  // redirect naar zichzelf oneindig door.
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const isAuthRoute = AUTH_ROUTES.has(normalizedPath);

  const portal = PORTALS.find(
    (p) => normalizedPath === p.prefix || normalizedPath.startsWith(`${p.prefix}/`)
  );
  const isPortalLoginRoute = portal?.loginRoute === normalizedPath;

  // ── Unauthenticated, binnen een portaal → dat portaal se eigen loginscherm ──
  if (!user && portal && !isPortalLoginRoute) {
    return redirectTo(portal.loginRoute, (url) => url.searchParams.set("next", pathname));
  }

  // ── Unauthenticated → /login (patiëntgedeelte) ──────────────────────────────
  // Uitzondering voor de kale root: Supabase's redirect-URLs-allowlist blijkt
  // elke aangevraagde redirectTo (uitnodigingslinks, magic links) terug te
  // brengen tot exact deze URL, met de sessie in een URL-fragment (#access_
  // token=...) — fragments bereiken de server nooit, dus een server-side
  // sessiecheck ziet hier altijd "niet ingelogd", ook vlak vóórdat de
  // client de echte sessie alsnog verwerkt. Zelfde uitzondering als
  // auth/callback en auth/reset-password (zie matcher hieronder) — de
  // client-side AuthGate (components/auth/AuthGate.tsx) handelt "/" zelf
  // af, inclusief het wachten op een nog-te-verwerken fragment.
  if (!user && !isAuthRoute && !isPortalLoginRoute && normalizedPath !== "/") {
    return redirectTo("/login", (url) => {
      if (pathname !== "/") url.searchParams.set("next", pathname);
    });
  }

  // ── Authenticated + op een portaal-loginscherm → terug naar dat portaal ─────
  if (user && portal && isPortalLoginRoute) {
    return redirectTo(portal.prefix);
  }

  // ── Authenticated + patiënten-auth route → dashboard ────────────────────────
  if (user && isAuthRoute) {
    return redirectTo("/");
  }

  // Always return the supabaseResponse — it carries any refreshed session cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, Supabase auth
    // callback routes that need to complete without redirection, and API routes.
    // API routes must never be redirected to an HTML page on an auth failure —
    // each one already checks auth itself and returns a proper JSON error/401
    // (see app/api/delete-account/route.ts). A middleware redirect here turns
    // into a non-JSON response that breaks the calling fetch().
    "/((?!_next/static|_next/image|favicon\\.ico|auth/callback|auth/reset-password|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
