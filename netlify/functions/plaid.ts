import { CountryCode, Products } from "plaid";
import { adminClient, ConfigError, handleError, json, planFor, requireUser } from "../lib/server";
import { plaid, plaidMessage, saveAccounts, syncItem } from "../lib/plaid";

/**
 * One endpoint for every bank-link action:
 *   { action: "link-token" }                       → start Plaid Link
 *   { action: "exchange", public_token, institution } → save the new connection and import
 *   { action: "sync" }                              → pull new transactions for every connection
 *   { action: "disconnect", item_id }               → remove a connection
 */
export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  try {
    const user = await requireUser(req);
    if (user instanceof Response) return user;
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) throw new ConfigError("PLAID_CLIENT_ID / PLAID_SECRET are missing.");

    const plan = await planFor(user.id);
    if (plan.tier === "free") return json(402, { error: "Bank syncing is part of Plus and Premium. Upgrade on Plans & billing to connect a bank." });

    const body = (await req.json().catch(() => ({}))) as { action?: string; public_token?: string; institution?: { institution_id?: string; name?: string }; item_id?: string };
    const db = adminClient();
    const api = plaid();

    try {
      switch (body.action) {
        case "link-token": {
          const { count } = await db.from("plaid_items").select("id", { count: "exact", head: true }).eq("user_id", user.id);
          if ((count ?? 0) >= 10) return json(400, { error: "You can link up to 10 banks." });
          const { data } = await api.linkTokenCreate({
            user: { client_user_id: user.id },
            client_name: "Money Vitals",
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: "en",
            transactions: { days_requested: 365 },
            redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
          });
          return json(200, { link_token: data.link_token });
        }

        case "exchange": {
          if (!body.public_token) return json(400, { error: "Missing bank token." });
          const { data } = await api.itemPublicTokenExchange({ public_token: body.public_token });
          const { error } = await db.from("plaid_items").upsert({
            user_id: user.id, item_id: data.item_id, access_token: data.access_token,
            institution_id: body.institution?.institution_id ?? null, institution_name: body.institution?.name ?? "Bank",
          }, { onConflict: "item_id" });
          if (error) throw error;
          const accounts = await api.accountsGet({ access_token: data.access_token });
          await saveAccounts(user.id, data.item_id, accounts.data.accounts);
          // The first import can take a moment on Plaid's side; a sync now grabs whatever is ready.
          const result = await syncItem(user.id, { item_id: data.item_id, access_token: data.access_token, cursor: null }).catch(() => ({ added: 0, modified: 0, removed: 0 }));
          return json(200, { ok: true, institution: body.institution?.name ?? "Bank", ...result });
        }

        case "sync": {
          const { data: items, error } = await db.from("plaid_items").select("item_id,access_token,cursor,institution_name").eq("user_id", user.id);
          if (error) throw error;
          let added = 0; const problems: string[] = [];
          for (const it of items ?? []) {
            try {
              const r = await syncItem(user.id, it);
              added += r.added;
            } catch (e) {
              const m = plaidMessage(e);
              await db.from("plaid_items").update({ status: m.code === "ITEM_LOGIN_REQUIRED" ? "relink" : "error" }).eq("item_id", it.item_id);
              problems.push(`${it.institution_name}: ${m.code === "ITEM_LOGIN_REQUIRED" ? "needs you to sign in again" : m.message}`);
            }
          }
          return json(200, { added, problems });
        }

        case "disconnect": {
          if (!body.item_id) return json(400, { error: "Missing connection." });
          const { data: it } = await db.from("plaid_items").select("access_token").eq("user_id", user.id).eq("item_id", body.item_id).maybeSingle();
          if (!it) return json(404, { error: "That connection wasn't found." });
          await api.itemRemove({ access_token: it.access_token }).catch(() => undefined);
          await db.from("plaid_items").delete().eq("user_id", user.id).eq("item_id", body.item_id); // accounts cascade
          return json(200, { ok: true });
        }

        default:
          return json(400, { error: "Unknown action." });
      }
    } catch (e) {
      if ((e as { response?: unknown }).response) {
        const m = plaidMessage(e);
        console.error("Plaid error", m.code, m.message);
        return json(502, { error: m.message, code: m.code });
      }
      throw e;
    }
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: "/api/plaid" };
