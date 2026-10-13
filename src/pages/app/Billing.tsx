import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { supabase, friendlyError } from "@/lib/supabase";
import { callApi } from "@/lib/api";
import { usePlan } from "@/hooks/usePlan";
import { useFinance } from "@/hooks/useFinance";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, Card, PageHeader, cx } from "@/components/ui";
import { PLANS } from "@/pages/Landing";

export default function Billing() {
  const plan = usePlan();
  const { reload } = useFinance();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Coming back from Stripe: the webhook may land a few seconds after the redirect, so poll briefly.
  useEffect(() => {
    const status = params.get("checkout");
    if (!status) return;
    if (status === "canceled") { toast("Checkout canceled — nothing was charged."); setParams({}, { replace: true }); return; }
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      await plan.refresh();
      if (tries >= 8) clearInterval(t);
    }, 2000);
    toast("Payment received — activating your plan…");
    setParams({}, { replace: true });
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTrial = async () => {
    setBusy("trial"); setErr(null);
    const { data, error } = await supabase.rpc("start_app_trial");
    setBusy(null);
    if (error) return setErr(friendlyError(error));
    await reload();
    const r = data as { started: boolean; alreadyUsed: boolean };
    toast(r.started ? "Your 7-day Premium trial has started. Try the AI advisor!" : "You've already used your free trial.", r.started ? "good" : "bad");
  };

  const checkout = async (tier: "plus" | "premium") => {
    setBusy(tier); setErr(null);
    const { data, error } = await callApi<{ url: string }>("/api/checkout", { tier });
    if (error || !data?.url) { setBusy(null); return setErr(error ?? "Couldn't start checkout."); }
    window.location.href = data.url;
  };

  const portal = async () => {
    setBusy("portal"); setErr(null);
    const { data, error } = await callApi<{ url: string }>("/api/billing-portal", {});
    if (error || !data?.url) { setBusy(null); return setErr(error ?? "Couldn't open billing."); }
    window.location.href = data.url;
  };

  const paid = plan.paidTier !== "free";

  return (
    <div className="space-y-6">
      <PageHeader title="Plans & billing" sub="Upgrade, change, or cancel anytime. Payments are handled securely by Stripe." />

      {err && <Alert>{err}</Alert>}

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">Current plan</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold capitalize">
            {plan.tier}
            {plan.trialActive && !paid && <Badge tone="gold">Trial</Badge>}
            {plan.status === "past_due" && <Badge tone="bad">Payment issue</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-mute">
            {paid && plan.periodEnd && (plan.cancelAtPeriodEnd ? `Ends ${new Date(plan.periodEnd).toLocaleDateString()} — won't renew.` : `Renews ${new Date(plan.periodEnd).toLocaleDateString()}.`)}
            {!paid && plan.trialActive && `Premium trial ends ${new Date(plan.trialEndsAt!).toLocaleDateString()}.`}
            {!paid && !plan.trialActive && "Free forever. Upgrade any time for analytics and the AI advisor."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {paid && <Button variant="secondary" onClick={portal} loading={busy === "portal"}>Manage billing</Button>}
          {!paid && !plan.trialUsed && (
            <Button onClick={startTrial} loading={busy === "trial"}><Sparkles className="h-4 w-4" /> Start free 7-day Premium trial</Button>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === plan.paidTier || (p.id === "free" && !paid);
          const featured = "featured" in p && p.featured;
          return (
            <Card key={p.id} className={cx("flex flex-col", featured && "border-ink")}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {isCurrent && <Badge tone="good">Current</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-mute">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1"><span className="num font-display text-4xl font-semibold">${p.price}</span><span className="text-sm text-ink-mute">/month</span></div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-vital-600" />{f}</li>)}
              </ul>
              <div className="mt-6">
                {p.id === "free" ? (
                  <Button variant="secondary" className="w-full" disabled>{isCurrent ? "Your plan" : "Included"}</Button>
                ) : paid ? (
                  <Button variant={isCurrent ? "secondary" : "primary"} className="w-full" onClick={portal} loading={busy === "portal"}>{isCurrent ? "Manage" : `Switch to ${p.name}`}</Button>
                ) : (
                  <Button variant={featured ? "primary" : "secondary"} className="w-full" onClick={() => checkout(p.id as "plus" | "premium")} loading={busy === p.id}>Get {p.name}</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-ink-mute">Prices in USD, billed monthly. Applicable taxes are shown at checkout. See our <a href="/refunds" className="underline">refund policy</a>.</p>
    </div>
  );
}
