import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new ConfigError(`Server setting ${name} is missing. Add it in Netlify → Site configuration → Environment variables.`);
  return v;
}

export class ConfigError extends Error {}

let admin: SupabaseClient | null = null;
/** Service-role client. Server only — bypasses row-level security, so always scope queries by user id. */
export function adminClient() {
  if (!admin) {
    admin = createClient(process.env.SUPABASE_URL || env("VITE_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** Resolve the signed-in user from the Authorization: Bearer <access token> header. */
export async function requireUser(req: Request): Promise<User | Response> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return json(401, { error: "Please sign in again." });
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return json(401, { error: "Your session expired. Please sign in again." });
  return data.user;
}

export type Tier = "free" | "plus" | "premium";

/** Effective plan: an active Stripe subscription, else an unexpired app trial (Premium), else free. */
export async function planFor(userId: string): Promise<{ tier: Tier; trial: boolean }> {
  const db = adminClient();
  const [{ data: subs }, { data: profile }] = await Promise.all([
    db.from("stripe_subscriptions").select("tier,status,current_period_end").eq("user_id", userId),
    db.from("profiles").select("trial_ends_at").eq("id", userId).maybeSingle(),
  ]);
  const now = Date.now();
  const live = (subs ?? []).filter((s) =>
    ["active", "trialing", "past_due"].includes(s.status) || (s.status === "canceled" && s.current_period_end && Date.parse(s.current_period_end) > now),
  );
  if (live.some((s) => s.tier === "premium")) return { tier: "premium", trial: false };
  if (profile?.trial_ends_at && Date.parse(profile.trial_ends_at) > now) return { tier: "premium", trial: true };
  if (live.some((s) => s.tier === "plus")) return { tier: "plus", trial: false };
  return { tier: "free", trial: false };
}

export function siteUrl(req: Request) {
  return process.env.URL || new URL(req.url).origin;
}

export function handleError(err: unknown) {
  if (err instanceof ConfigError) {
    console.error(err.message);
    return json(503, { error: "This feature isn't set up yet. The site owner needs to finish configuration." });
  }
  console.error(err);
  return json(500, { error: "Something went wrong on our side. Please try again." });
}
