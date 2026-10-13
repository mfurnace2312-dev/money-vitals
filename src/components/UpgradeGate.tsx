import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "./ui";

/** Shows children when the user's plan allows it, otherwise a short upgrade card. */
export function UpgradeGate({ need, feature, children }: { need: "plus" | "premium"; feature: string; children: ReactNode }) {
  const plan = usePlan();
  const ok = need === "plus" ? plan.hasPlus : plan.hasPremium;
  if (plan.loading) return null;
  if (ok) return <>{children}</>;
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl2 border border-paper-line bg-gradient-to-br from-white to-vital-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-ink p-2 text-gold-400"><Lock className="h-4 w-4" /></div>
        <div>
          <div className="font-semibold">{feature} is part of {need === "plus" ? "Plus" : "Premium"}</div>
          <div className="text-sm text-ink-mute">
            {need === "premium" && !plan.trialUsed ? "Start a free 7-day Premium trial — no card needed." : `Upgrade to ${need === "plus" ? "Plus ($10/mo)" : "Premium ($20/mo)"} to unlock it.`}
          </div>
        </div>
      </div>
      <Link to="/billing"><Button size="sm">{need === "premium" && !plan.trialUsed ? "Start free trial" : "See plans"}</Button></Link>
    </div>
  );
}
