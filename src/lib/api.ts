import { supabase } from "./supabase";

/** Call one of our Netlify server functions as the signed-in user. Returns data or a readable error. */
export async function callApi<T>(path: string, body: unknown): Promise<{ data?: T; error?: string }> {
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return { error: "Please sign in again." };
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return { error: out?.error || `Request failed (${res.status}).` };
    return { data: out as T };
  } catch {
    return { error: "Can't reach the server. Check your connection and try again." };
  }
}
