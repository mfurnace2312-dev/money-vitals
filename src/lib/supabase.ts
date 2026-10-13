import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  // Surfaced on screen by <ConfigGuard>; logged here for the console too.
  console.error("[Money Vitals] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient(url ?? "https://invalid.supabase.co", key ?? "missing", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

/** Turn any Supabase/Postgres/network error into a sentence a person can act on. */
export function friendlyError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Something went wrong.";
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Try again or reset your password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link we sent.";
  if (m.includes("user already registered")) return "An account with that email already exists. Try signing in instead.";
  if (m.includes("password should be")) return "Password must be at least 8 characters.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Can't reach the server. Check your connection and try again.";
  if (m.includes("jwt") || m.includes("not authenticated")) return "Your session expired. Please sign in again.";
  return raw;
}
