import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resolveEnv(raw: string | undefined, fallback: string): string {
  if (!raw || raw === "your-supabase-project-url" || raw === "your-supabase-anon-key") return fallback;
  return raw;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    resolveEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://placeholder.supabase.co"),
    resolveEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "placeholder-anon-key"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie writes are a no-op in read-only contexts
          }
        },
      },
    }
  );
}
