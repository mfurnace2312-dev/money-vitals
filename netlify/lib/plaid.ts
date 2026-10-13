import { Configuration, PlaidApi, PlaidEnvironments, type Transaction as PlaidTx, type AccountBase } from "plaid";
import { adminClient, env } from "./server";

let client: PlaidApi | null = null;

/** Plaid client. PLAID_ENV is "sandbox" or "production" (defaults to production). */
export function plaid() {
  if (!client) {
    const name = (process.env.PLAID_ENV || "production").toLowerCase();
    const basePath = name === "sandbox" ? PlaidEnvironments.sandbox : PlaidEnvironments.production;
    client = new PlaidApi(new Configuration({
      basePath,
      baseOptions: { headers: { "PLAID-CLIENT-ID": env("PLAID_CLIENT_ID"), "PLAID-SECRET": env("PLAID_SECRET"), "Plaid-Version": "2020-09-14" } },
    }));
  }
  return client;
}

/** Readable message from a Plaid API error. */
export function plaidMessage(err: unknown): { code: string; message: string } {
  const data = (err as { response?: { data?: { error_code?: string; display_message?: string | null; error_message?: string } } })?.response?.data;
  return { code: data?.error_code ?? "UNKNOWN", message: data?.display_message || data?.error_message || "The bank connection failed." };
}

const CATEGORY: Record<string, string> = {
  INCOME: "Other Income", TRANSFER_IN: "Other Income", FOOD_AND_DRINK: "Dining Out", GENERAL_MERCHANDISE: "Household",
  HOME_IMPROVEMENT: "Household", MEDICAL: "Medical", PERSONAL_CARE: "Personal Care", ENTERTAINMENT: "Entertainment",
  TRAVEL: "Travel", TRANSPORTATION: "Transportation", RENT_AND_UTILITIES: "Household", LOAN_PAYMENTS: "Miscellaneous",
  BANK_FEES: "Miscellaneous", GENERAL_SERVICES: "Miscellaneous", GOVERNMENT_AND_NON_PROFIT: "Miscellaneous", TRANSFER_OUT: "Miscellaneous",
};

function mapCategory(t: PlaidTx) {
  const primary = t.personal_finance_category?.primary ?? "";
  const detailed = t.personal_finance_category?.detailed ?? "";
  if (detailed.includes("GROCERIES")) return "Groceries";
  if (detailed.includes("GAS")) return "Fuel";
  if (primary === "INCOME" && detailed.includes("WAGES")) return "Salary";
  return CATEGORY[primary] ?? "Miscellaneous";
}

function toRow(userId: string, t: PlaidTx, accounts: Map<string, string>) {
  // Plaid: positive amount = money leaving the account.
  const income = t.amount < 0;
  return {
    user_id: userId,
    plaid_transaction_id: t.transaction_id,
    source: "plaid",
    date: t.authorized_date ?? t.date,
    description: (t.merchant_name || t.name || "Transaction").slice(0, 200),
    merchant: t.merchant_name ?? null,
    category: mapCategory(t),
    amount: Math.abs(t.amount),
    type: income ? "income" : "expense",
    account: accounts.get(t.account_id) ?? null,
    pending: t.pending,
    recurring: false,
  };
}

export async function saveAccounts(userId: string, itemId: string, accounts: AccountBase[]) {
  if (!accounts.length) return;
  const { error } = await adminClient().from("plaid_accounts").upsert(accounts.map((a) => ({
    account_id: a.account_id, user_id: userId, item_id: itemId, name: a.name, official_name: a.official_name ?? null, mask: a.mask ?? null,
    type: a.type, subtype: a.subtype ?? null, current_balance: a.balances.current, available_balance: a.balances.available,
    credit_limit: a.balances.limit, iso_currency: a.balances.iso_currency_code, updated_at: new Date().toISOString(),
  })));
  if (error) throw error;
}

/** Pull everything new since the stored cursor into the transactions table. */
export async function syncItem(userId: string, item: { item_id: string; access_token: string; cursor: string | null }) {
  const db = adminClient();
  const api = plaid();
  let cursor = item.cursor ?? undefined;
  let added = 0, modified = 0, removed = 0;

  const acc = await api.accountsGet({ access_token: item.access_token });
  await saveAccounts(userId, item.item_id, acc.data.accounts);
  const names = new Map(acc.data.accounts.map((a) => [a.account_id, `${a.name}${a.mask ? ` ••${a.mask}` : ""}`]));

  for (let page = 0; page < 20; page++) {
    const { data } = await api.transactionsSync({ access_token: item.access_token, cursor, count: 500 });
    const upserts = [...data.added, ...data.modified].map((t) => toRow(userId, t, names));
    if (upserts.length) {
      const { error } = await db.from("transactions").upsert(upserts, { onConflict: "plaid_transaction_id" });
      if (error) throw error;
    }
    if (data.removed.length) {
      await db.from("transactions").delete().eq("user_id", userId).in("plaid_transaction_id", data.removed.map((r) => r.transaction_id));
    }
    added += data.added.length; modified += data.modified.length; removed += data.removed.length;
    cursor = data.next_cursor;
    if (!data.has_more) break;
  }

  await db.from("plaid_items").update({ cursor, status: "ok", last_synced_at: new Date().toISOString() }).eq("item_id", item.item_id);
  return { added, modified, removed };
}
