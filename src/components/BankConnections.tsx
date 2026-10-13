import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Building2, Link2, RefreshCw, Unlink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { callApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useFinance } from "@/hooks/useFinance";
import { usePlan } from "@/hooks/usePlan";
import { useToast } from "./toast";
import { UpgradeGate } from "./UpgradeGate";
import { Badge, Button, Card, CardHeader } from "./ui";
import { money } from "@/lib/finance";

type Connection = { id: string; item_id: string; institution_name: string | null; status: string; last_synced_at: string | null };
type Account = { account_id: string; item_id: string; name: string | null; mask: string | null; type: string | null; subtype: string | null; current_balance: number | null; available_balance: number | null };

export const LINK_TOKEN_KEY = "mv-plaid-link-token";

/** Opens Plaid Link. Also used by the OAuth return page with `receivedRedirectUri`. */
export function usePlaidConnect(onDone: () => void, token: string | null, receivedRedirectUri?: string) {
  const toast = useToast();
  const { reload } = useFinance();
  const onSuccess = useCallback(async (public_token: string | null, meta: PlaidLinkOnSuccessMetadata) => {
    if (!public_token) { toast("The bank connection didn't finish. Please try again.", "bad"); return; }
    try { localStorage.removeItem(LINK_TOKEN_KEY); } catch { /* ignore */ }
    toast(`Connecting ${meta.institution?.name ?? "your bank"}…`);
    const { data, error } = await callApi<{ institution: string; added: number }>("/api/plaid", {
      action: "exchange", public_token, institution: { institution_id: meta.institution?.institution_id, name: meta.institution?.name },
    });
    if (error) { toast(error, "bad"); return; }
    toast(`${data!.institution} connected${data!.added ? ` — ${data!.added} transactions imported` : ". Transactions will appear after the first sync"}.`);
    await reload();
    onDone();
  }, [toast, reload, onDone]);
  return usePlaidLink({ token, onSuccess, receivedRedirectUri, onExit: (err) => { if (err) toast(err.display_message || "The bank connection was closed.", "bad"); } });
}

function Inner() {
  const { user } = useAuth();
  const { reload } = useFinance();
  const toast = useToast();
  const [conns, setConns] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [c, a] = await Promise.all([
      supabase.from("plaid_connections").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("plaid_accounts").select("account_id,item_id,name,mask,type,subtype,current_balance,available_balance").eq("user_id", user.id),
    ]);
    setConns((c.data as Connection[]) ?? []);
    setAccounts((a.data as Account[]) ?? []);
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const { open, ready } = usePlaidConnect(() => { setToken(null); void load(); }, token);
  useEffect(() => { if (token && ready) open(); }, [token, ready, open]);

  const connect = async () => {
    setBusy("connect");
    const { data, error } = await callApi<{ link_token: string }>("/api/plaid", { action: "link-token" });
    setBusy(null);
    if (error) return toast(error, "bad");
    try { localStorage.setItem(LINK_TOKEN_KEY, data!.link_token); } catch { /* ignore */ }
    setToken(data!.link_token);
  };

  const sync = async () => {
    setBusy("sync");
    const { data, error } = await callApi<{ added: number; problems: string[] }>("/api/plaid", { action: "sync" });
    setBusy(null);
    if (error) return toast(error, "bad");
    if (data!.problems.length) toast(data!.problems.join(" · "), "bad");
    else toast(data!.added ? `${data!.added} new transactions imported.` : "Everything is up to date.");
    await Promise.all([reload(), load()]);
  };

  const disconnect = async (itemId: string) => {
    if (confirm !== itemId) { setConfirm(itemId); return; }
    setBusy(itemId);
    const { error } = await callApi("/api/plaid", { action: "disconnect", item_id: itemId });
    setBusy(null); setConfirm(null);
    if (error) return toast(error, "bad");
    toast("Bank disconnected. Imported transactions were kept.");
    await load();
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-vital-600" />Linked banks</span>}
        sub="Securely connected through Plaid. We never see your bank password."
        action={
          <div className="flex gap-2">
            {conns.length > 0 && <Button size="sm" variant="secondary" onClick={sync} loading={busy === "sync"}><RefreshCw className="h-3.5 w-3.5" /> Sync now</Button>}
            <Button size="sm" onClick={connect} loading={busy === "connect"}><Link2 className="h-3.5 w-3.5" /> Connect a bank</Button>
          </div>
        }
      />
      {conns.length === 0 ? (
        <p className="text-sm text-ink-mute">Connect your checking, savings or credit card accounts to import transactions automatically.</p>
      ) : (
        <div className="space-y-4">
          {conns.map((c) => (
            <div key={c.id} className="rounded-xl border border-paper-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.institution_name}</span>
                  {c.status === "relink" && <Badge tone="warn">Sign in again</Badge>}
                  {c.status === "error" && <Badge tone="bad">Sync problem</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-mute">
                  {c.last_synced_at && <span>Synced {new Date(c.last_synced_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
                  <Button size="sm" variant={confirm === c.item_id ? "danger" : "ghost"} onClick={() => disconnect(c.item_id)} loading={busy === c.item_id}>
                    <Unlink className="h-3.5 w-3.5" /> {confirm === c.item_id ? "Confirm" : "Disconnect"}
                  </Button>
                </div>
              </div>
              <ul className="mt-2 divide-y divide-paper-line">
                {accounts.filter((a) => a.item_id === c.item_id).map((a) => (
                  <li key={a.account_id} className="flex items-center justify-between py-2 text-sm">
                    <span>{a.name}{a.mask && <span className="text-ink-mute"> ••{a.mask}</span>} <span className="text-xs capitalize text-ink-mute">· {a.subtype ?? a.type}</span></span>
                    <span className="num font-semibold">{a.current_balance === null ? "—" : money(Number(a.current_balance), 2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function BankConnections() {
  const plan = usePlan();
  if (plan.loading) return null;
  return <UpgradeGate need="plus" feature="Automatic bank syncing"><Inner /></UpgradeGate>;
}
