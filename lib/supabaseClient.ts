import { createBrowserClient } from "@supabase/ssr";

function resolveEnv(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  // Reject unconfigured placeholder strings
  if (raw === "your-supabase-project-url" || raw === "your-supabase-anon-key") return fallback;
  return raw;
}

const SUPABASE_URL = resolveEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://placeholder.supabase.co"
);
const SUPABASE_ANON_KEY = resolveEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "placeholder-anon-key"
);

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
