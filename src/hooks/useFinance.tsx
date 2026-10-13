import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, friendlyError } from "@/lib/supabase";
import { EMPTY_DATA, type FinanceData } from "@/lib/finance";
import { useAuth } from "./useAuth";

/** Tables the signed-in user owns rows in, keyed to their slot in FinanceData. */
export const TABLES = {
  entries: "budget_entries",
  bills: "bills",
  debts: "debts",
  goals: "savings_goals",
  assets: "assets",
  liabilities: "liabilities",
  transactions: "transactions",
  subscriptions: "subscriptions",
} as const;
export type Collection = keyof typeof TABLES;

type FinanceCtx = {
  data: FinanceData;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  insert: (c: Collection, row: Record<string, unknown>) => Promise<string | null>;
  insertMany: (c: Collection, rows: Record<string, unknown>[]) => Promise<string | null>;
  update: (c: Collection, id: string, patch: Record<string, unknown>) => Promise<string | null>;
  remove: (c: Collection, id: string) => Promise<string | null>;
  updateProfile: (patch: Record<string, unknown>) => Promise<string | null>;
};

const Ctx = createContext<FinanceCtx | null>(null);

const ORDER: Record<Collection, { col: string; asc: boolean }> = {
  entries: { col: "created_at", asc: true },
  bills: { col: "due_day", asc: true },
  debts: { col: "balance", asc: false },
  goals: { col: "created_at", asc: true },
  assets: { col: "value", asc: false },
  liabilities: { col: "amount", asc: false },
  transactions: { col: "date", asc: false },
  subscriptions: { col: "price", asc: false },
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<FinanceData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setData(EMPTY_DATA); setLoading(false); return; }
    setError(null);
    const keys = Object.keys(TABLES) as Collection[];
    const [profileRes, benchRes, ...rest] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("benchmarks").select("*"),
      ...keys.map((k) => supabase.from(TABLES[k]).select("*").eq("user_id", user.id).order(ORDER[k].col, { ascending: ORDER[k].asc }).limit(5000)),
    ]);
    const firstError = [profileRes, benchRes, ...rest].find((r) => r.error)?.error;
    if (firstError) setError(friendlyError(firstError));

    let profile = profileRes.data;
    if (!profile && !profileRes.error) {
      // Safety net: the database trigger normally creates this on sign-up.
      const ins = await supabase.from("profiles").insert({ id: user.id, display_name: user.user_metadata?.display_name ?? null }).select("*").maybeSingle();
      profile = ins.data;
    }

    const next = { ...EMPTY_DATA, profile, benchmarks: benchRes.data ?? [] } as FinanceData;
    keys.forEach((k, i) => { (next as Record<string, unknown>)[k] = rest[i].data ?? []; });
    setData(next);
    setLoading(false);
  }, [user]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const insert = useCallback(async (c: Collection, row: Record<string, unknown>) => {
    if (!user) return "Please sign in again.";
    const { data: created, error } = await supabase.from(TABLES[c]).insert({ ...row, user_id: user.id }).select("*").single();
    if (error) return friendlyError(error);
    setData((d) => ({ ...d, [c]: [...(d[c] as unknown[]), created] }));
    return null;
  }, [user]);

  const insertMany = useCallback(async (c: Collection, rows: Record<string, unknown>[]) => {
    if (!user || rows.length === 0) return null;
    const { data: created, error } = await supabase.from(TABLES[c]).insert(rows.map((r) => ({ ...r, user_id: user.id }))).select("*");
    if (error) return friendlyError(error);
    setData((d) => ({ ...d, [c]: [...(d[c] as unknown[]), ...(created ?? [])] }));
    return null;
  }, [user]);

  const update = useCallback(async (c: Collection, id: string, patch: Record<string, unknown>) => {
    // Optimistic: show the change immediately, roll back if the save fails.
    let before: unknown[] = [];
    setData((d) => {
      before = d[c] as unknown[];
      return { ...d, [c]: (d[c] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...patch } : r)) };
    });
    const { error } = await supabase.from(TABLES[c]).update(patch).eq("id", id);
    if (error) { setData((d) => ({ ...d, [c]: before })); return friendlyError(error); }
    return null;
  }, []);

  const remove = useCallback(async (c: Collection, id: string) => {
    let before: unknown[] = [];
    setData((d) => { before = d[c] as unknown[]; return { ...d, [c]: (d[c] as { id: string }[]).filter((r) => r.id !== id) }; });
    const { error } = await supabase.from(TABLES[c]).delete().eq("id", id);
    if (error) { setData((d) => ({ ...d, [c]: before })); return friendlyError(error); }
    return null;
  }, []);

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    if (!user) return "Please sign in again.";
    const { data: p, error } = await supabase.from("profiles").update(patch).eq("id", user.id).select("*").single();
    if (error) return friendlyError(error);
    setData((d) => ({ ...d, profile: p }));
    return null;
  }, [user]);

  const value = useMemo(
    () => ({ data, loading, error, reload: load, insert, insertMany, update, remove, updateProfile }),
    [data, loading, error, load, insert, insertMany, update, remove, updateProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFinance must be used inside <FinanceProvider>");
  return c;
}
