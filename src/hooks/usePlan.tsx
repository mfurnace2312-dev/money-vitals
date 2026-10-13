import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useFinance } from "./useFinance";

export type Tier = "free" | "plus" | "premium";

export type PlanState = {
  tier: Tier;
  /** Paid tier from Stripe, ignoring the trial. */
  paidTier: Tier;
  status: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  trialUsed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Plus features: CSV, YTD analytics, net worth trends, subscription radar. */
  hasPlus: boolean;
  /** Premium features: AI advisor and AI reports. */
  hasPremium: boolean;
};

const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function usePlan(): PlanState {
  const { user } = useAuth();
  const { data } = useFinance();
  const [paidTier, setPaidTier] = useState<Tier>("free");
  const [status, setStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancel] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: rows } = await supabase
      .from("stripe_subscriptions")
      .select("tier,status,current_period_end,cancel_at_period_end,environment")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    const now = Date.now();
    const live = (rows ?? []).find(
      (r) => LIVE_STATUSES.has(r.status) || (r.status === "canceled" && r.current_period_end && Date.parse(r.current_period_end) > now),
    );
    setPaidTier((live?.tier as Tier) ?? "free");
    setStatus(live?.status ?? null);
    setPeriodEnd(live?.current_period_end ?? null);
    setCancel(Boolean(live?.cancel_at_period_end));
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const trialEndsAt = data.profile?.trial_ends_at ?? null;
  const trialActive = Boolean(trialEndsAt && Date.parse(trialEndsAt) > Date.now());
  const tier: Tier = paidTier !== "free" ? paidTier : trialActive ? "premium" : "free";

  return {
    tier, paidTier, status, periodEnd, cancelAtPeriodEnd,
    trialActive, trialEndsAt, trialUsed: Boolean(data.profile?.trial_started_at),
    loading, refresh,
    hasPlus: tier === "plus" || tier === "premium",
    hasPremium: tier === "premium",
  };
}
