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
    <div className="flex items-center gap-1 rounded-full border-2 border-ink/10 bg-white p-1">
      <button onClick={m.prev} className="rounded-full p-1.5 text-ink-soft hover:bg-pulse-50 hover:text-pulse-500" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
      <button onClick={m.reset} className="min-w-[140px] px-1 text-center text-sm font-bold" title="Jump to this month">{m.label}</button>
      <button onClick={m.next} className="rounded-full p-1.5 text-ink-soft hover:bg-pulse-50 hover:text-pulse-500" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function NavItems({ onPick }: { onPick?: () => void }) {
  const { signOut, user } = useAuth();
  const plan = usePlan();
  const link = (item: (typeof NAV)[number]) => (
    <NavLink key={item.to} to={item.to} onClick={onPick}
      className={({ isActive }) => cx("flex items-center gap-3 rounded-full px-3.5 py-2 text-[14px] font-semibold transition",
        isActive ? "bg-gold-400 text-ink" : "text-white/70 hover:bg-white/10 hover:text-white")}>
      <item.icon className="h-[18px] w-[18px]" aria-hidden />
      {item.label}
    </NavLink>
  );
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-0.5" aria-label="Main">{NAV.map(link)}</nav>
      <div className="mt-6 space-y-0.5 border-t border-white/10 pt-4">
        {BOTTOM.map(link)}
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-full px-3.5 py-2 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">
          <LogOut className="h-[18px] w-[18px]" aria-hidden /> Sign out
        </button>
      </div>
      <div className="mt-4 rounded-2xl bg-white/[.07] px-3.5 py-3">
        <div className="truncate text-xs text-white/60" title={user?.email ?? ""}>{user?.email}</div>
        <div className="mt-1.5">
          {plan.tier === "free" && <span className="inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">Free plan</span>}
          {plan.tier === "plus" && <span className="inline-flex rounded-full bg-vital-400 px-2 py-0.5 text-[11px] font-bold text-ink">Plus</span>}
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
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto bg-ink px-4 py-6 lg:block">
        <div className="mb-8 px-2"><Logo to="/dashboard" light /></div>
        <NavItems />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Logo to="/dashboard" light />
        <button onClick={() => setOpen(true)} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-ink px-4 py-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo to="/dashboard" light />
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-white hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <NavItems onPick={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-12">
          {MONTHLY.has(pathname) && <div className="mb-4 flex justify-end"><MonthSwitcher /></div>}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
