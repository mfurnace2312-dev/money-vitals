import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Wallet, Receipt, CreditCard, PiggyBank, Landmark, Repeat, ListOrdered,
  Sparkles, Settings, Gem, LogOut, Menu, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Logo } from "./brand";
import { cx, Badge } from "./ui";
import { useAuth } from "@/hooks/useAuth";
import { useMonth } from "@/hooks/useMonth";
import { usePlan } from "@/hooks/usePlan";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/debts", label: "Debt payoff", icon: CreditCard },
  { to: "/savings", label: "Savings goals", icon: PiggyBank },
  { to: "/net-worth", label: "Net worth", icon: Landmark },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/advisor", label: "AI advisor", icon: Sparkles },
];
const BOTTOM = [
  { to: "/billing", label: "Plans & billing", icon: Gem },
  { to: "/settings", label: "Settings", icon: Settings },
];
const MONTHLY = new Set(["/dashboard", "/budget", "/bills"]);

export function MonthSwitcher() {
  const m = useMonth();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-paper-line bg-white p-1">
      <button onClick={m.prev} className="rounded-md p-1.5 text-ink-soft hover:bg-ink/5" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
      <button onClick={m.reset} className="min-w-[132px] px-1 text-center text-sm font-semibold" title="Jump to this month">{m.label}</button>
      <button onClick={m.next} className="rounded-md p-1.5 text-ink-soft hover:bg-ink/5" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function NavItems({ onPick }: { onPick?: () => void }) {
  const { signOut, user } = useAuth();
  const plan = usePlan();
  const link = (item: (typeof NAV)[number]) => (
    <NavLink key={item.to} to={item.to} onClick={onPick}
      className={({ isActive }) => cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink")}>
      <item.icon className="h-[18px] w-[18px]" aria-hidden />
      {item.label}
    </NavLink>
  );
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-0.5" aria-label="Main">{NAV.map(link)}</nav>
      <div className="mt-6 space-y-0.5 border-t border-paper-line pt-4">
        {BOTTOM.map(link)}
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
          <LogOut className="h-[18px] w-[18px]" aria-hidden /> Sign out
        </button>
      </div>
      <div className="mt-4 rounded-xl bg-ink/[.04] px-3 py-3">
        <div className="truncate text-xs text-ink-mute" title={user?.email ?? ""}>{user?.email}</div>
        <div className="mt-1.5">
          {plan.tier === "free" && <Badge>Free plan</Badge>}
          {plan.tier === "plus" && <Badge tone="good">Plus</Badge>}
          {plan.tier === "premium" && <Badge tone="gold">{plan.trialActive && plan.paidTier === "free" ? "Premium trial" : "Premium"}</Badge>}
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-paper-line bg-paper px-4 py-5 lg:block">
        <div className="mb-7 px-2"><Logo to="/dashboard" /></div>
        <NavItems />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-paper-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-ink/5" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-72 bg-paper px-4 py-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo to="/dashboard" />
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-ink/5" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <NavItems onPick={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {MONTHLY.has(pathname) && <div className="mb-4 flex justify-end"><MonthSwitcher /></div>}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
