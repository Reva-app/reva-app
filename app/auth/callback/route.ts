import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` can be an explicit destination passed through OAuth state; we only
  // honour it when it has a real value (not the bare "/" default).
  const nextParam = searchParams.get("next") ?? "";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      const userId = sessionData.user.id;

      // Determine where to send the user:
      // 1. If an explicit `next` was passed (e.g. from a protected-route redirect), use it.
      // 2. Otherwise check setup_completed to decide dashboard vs onboarding.
      let redirectTo = "/";

      if (nextParam && nextParam.startsWith("/") && nextParam !== "/") {
        redirectTo = nextParam;
      } else {
        // Check whether this user has finished onboarding
        const { data: settings } = await supabase
          .from("settings")
          .select("setup_completed")
          .eq("user_id", userId)
          .maybeSingle();

        const setupDone = settings?.setup_completed ?? false;
        redirectTo = setupDone ? "/" : "/instellingen";
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Something went wrong — send back to login
  return NextResponse.redirect(`${origin}/login`);
}
