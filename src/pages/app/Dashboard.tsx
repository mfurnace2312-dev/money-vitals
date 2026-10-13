import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Sparkles, Wand2, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinance } from "@/hooks/useFinance";
import { useMonth } from "@/hooks/useMonth";
import { usePlan } from "@/hooks/usePlan";
import { supabase, friendlyError } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import { Ecg } from "@/components/brand";
import { Alert, Badge, Button, Card, CardHeader, Empty, Progress, Spinner, Stat, cx } from "@/components/ui";
import {
  dtiBand, dtiFor, emergencyFund, healthScore, money, pct, recentMonths, safeToSpend, simulatePayoff, summarizeMonth, netWorth,
} from "@/lib/finance";

function Welcome() {
  const { reload, data } = useFinance();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const loadSample = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("seed_demo_data");
    setBusy(false);
    if (error) return toast(friendlyError(error), "bad");
    await reload();
    toast("Sample data loaded — explore, then replace it with your own numbers.");
  };
  const name = data.profile?.display_name;
  return (
    <div>
      <h1 className="font-display text-5xl">{name ? `Welcome, ${name}.` : "Welcome to Money Vitals."}</h1>
      <p className="mt-2 max-w-xl text-ink-mute">Let's get your first month on the board. Start with your income and a few expenses — everything else calculates from there.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <Wallet className="h-6 w-6 text-pulse-500" />
          <h2 className="mt-4 font-display text-2xl">Enter my real numbers</h2>
          <p className="mt-1 flex-1 text-sm text-ink-mute">Add this month's income and spending categories. Takes about five minutes.</p>
          <Link to="/budget" className="mt-5"><Button className="w-full">Start my budget</Button></Link>
        </Card>
        <Card className="flex flex-col">
          <Wand2 className="h-6 w-6 text-pulse-500" />
          <h2 className="mt-4 font-display text-2xl">Look around with sample data</h2>
          <p className="mt-1 flex-1 text-sm text-ink-mute">Fill the app with a realistic example household so you can see every feature. You can delete it anytime.</p>
          <Button variant="secondary" className="mt-5 w-full" onClick={loadSample} loading={busy}>Load sample data</Button>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error } = useFinance();
  const m = useMonth();
  const plan = usePlan();

  const calc = useMemo(() => {
    const s = summarizeMonth(data, m.year, m.month1);
    const dti = dtiFor(data, s);
    const efGoal = data.goals.find((g) => g.category === "Emergency Fund" || /emergency/i.test(g.name));
    const ef = emergencyFund(s.essentials, efGoal ? Number(efGoal.saved_amount) : 0);
    return {
      s, dti, ef,
      health: healthScore(s, dti, ef.covered),
      trend: recentMonths(data, m.year, m.month1, 6),
      sts: safeToSpend(s),
      payoff: simulatePayoff(data.debts, 0, "avalanche"),
      nw: netWorth(data),
      bills: data.bills.filter((b) => b.month === m.key).sort((a, b) => Number(a.paid) - Number(b.paid) || a.due_day - b.due_day),
      cats: Object.entries(s.byCategory).sort((a, b) => b[1].actual - a[1].actual).slice(0, 6),
    };
  }, [data, m.year, m.month1, m.key]);

  if (loading) return <Spinner label="Loading your numbers" />;

  const hasAnything = data.entries.length + data.bills.length + data.debts.length + data.goals.length + data.assets.length > 0;
  if (!hasAnything) return <>{error && <div className="mb-4"><Alert>{error}</Alert></div>}<Welcome /></>;

  const { s, dti, ef, health, trend, sts, payoff, nw, bills, cats } = calc;
  const backBand = dtiBand(dti.back);
  const noIncome = s.income === 0;

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{s.label}</p>
          <h1 className="mt-1 font-display text-4xl sm:text-[34px]">{data.profile?.display_name ? `Hi, ${data.profile.display_name}` : "Your money at a glance"}</h1>
        </div>
        {plan.trialActive && plan.paidTier === "free" && (
          <Badge tone="gold">Premium trial · ends {new Date(plan.trialEndsAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Badge>
        )}
      </div>

      {noIncome && (
        <Alert tone="info">No income recorded for {s.label} yet. <Link to="/budget" className="font-semibold underline">Add it in Budget</Link> so your ratios calculate.</Alert>
      )}

      {/* Hero */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="relative overflow-hidden border-0 bg-pulse-500 text-white">
          <Ecg className="pointer-events-none absolute -right-10 top-6 h-24 w-[70%] text-white/15" width={3} />
          <div className="relative">
            <div className="text-sm font-medium text-white/70">Left after bills, debt & savings</div>
            <div className={cx("num mt-2 font-display text-6xl sm:text-7xl", s.moneyLeft < 0 ? "text-alert-300" : "text-gold-400")}>{money(s.moneyLeft)}</div>
            <p className="mt-3 max-w-md text-[15px] text-white/75">
              {s.moneyLeft >= 0
                ? m.isCurrent ? <>About <span className="num font-semibold text-white">{money(sts.perDay)}</span>/day is safe to spend for the next {sts.daysLeft} days.</> : "Unassigned money for this month."
                : "You're committed beyond your income this month. Trim a category or move a goal contribution."}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
              {[["Income", money(s.income)], ["Committed", money(s.committed)], ["To savings", money(s.savings)], ["Savings rate", pct(s.savingsRate)]].map(([k, v]) => (
                <div key={k}><div className="text-xs text-white/60">{k}</div><div className="num mt-0.5 font-display text-2xl">{v}</div></div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Financial health" sub="Weighted from five vital signs" />
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 44 44" className="h-24 w-24 -rotate-90" aria-hidden>
              <circle cx="22" cy="22" r="18" fill="none" stroke="#EEEBFF" strokeWidth="6" />
              <circle cx="22" cy="22" r="18" fill="none" stroke={health.score >= 65 ? "#3D2BFF" : health.score >= 40 ? "#FFD23F" : "#E5382D"} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(health.score / 100) * 113.1} 113.1`} />
            </svg>
            <div>
              <span className="num font-display text-6xl">{health.score}</span>
              <div className="text-sm font-bold text-pulse-500">{health.band}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {health.parts.map((p) => (
              <div key={p.label}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-ink-soft">{p.label}</span><span className="num text-ink-mute">{Math.round(p.s)}</span></div>
                <Progress value={p.s} tone={p.s >= 65 ? "good" : p.s >= 40 ? "warn" : "bad"} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <Stat label="Back-end DTI" value={pct(dti.back)} sub={<>Front-end {pct(dti.front)} · lenders like under 36%</>} />
          <div className="mt-3"><Badge tone={backBand.tone}>{backBand.label}</Badge></div>
        </Card>
        <Card>
          <Stat label="Debt-free date" value={data.debts.some((d) => !d.is_housing && Number(d.balance) > 0) ? payoff.freeDate : "No debts 🎉"}
            sub={payoff.months > 0 ? <>{payoff.months} months · {money(payoff.interest)} interest at minimums</> : "Nothing to pay off"} />
          <Link to="/debts" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-pulse-500 hover:underline">Speed it up</Link>
        </Card>
        <Card>
          <Stat label="Net worth" value={money(nw.net)} tone={nw.net >= 0 ? "good" : "bad"} sub={<>{money(nw.assets)} assets · {money(nw.liabilities)} owed</>} />
          <div className="mt-3 text-xs text-ink-mute">Emergency fund: <span className="num font-semibold text-ink">{ef.covered.toFixed(1)} months</span> of essentials</div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Cash flow, last 6 months" sub="Income vs everything committed" />
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend.map((t) => ({ name: t.label.slice(0, 3), Income: Math.round(t.income), Committed: Math.round(t.committed) }))} barGap={4}>
                <CartesianGrid vertical={false} stroke="#E3E1F5" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#6E6A94" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#6E6A94" width={52} tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
                <Tooltip cursor={{ fill: "rgba(14,26,22,.04)" }} formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #E3E1F5", fontSize: 13 }} />
                <Bar dataKey="Income" fill="#3D2BFF" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Committed" fill="#0E1A16" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Bills this month" sub={`${money(s.billsPaid)} of ${money(s.bills)} paid`} action={<Link to="/bills" className="text-xs font-semibold text-pulse-500 hover:underline">Manage</Link>} />
          {bills.length === 0 ? (
            <p className="text-sm text-ink-mute">No bills for {s.label}. <Link to="/bills" className="font-semibold text-ink underline">Add them</Link> or copy last month's.</p>
          ) : (
            <ul className="divide-y divide-paper-line">
              {bills.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <CalendarClock className={cx("h-4 w-4", b.paid ? "text-pulse-500" : "text-ink-mute")} />
                    <span className={cx(b.paid && "text-ink-mute line-through")}>{b.name}</span>
                    <span className="text-xs text-ink-mute">day {b.due_day}</span>
                  </div>
                  <span className="num font-semibold">{money(Number(b.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Spending vs plan" sub="Top categories this month" action={<Link to="/budget" className="text-xs font-semibold text-pulse-500 hover:underline">Edit budget</Link>} />
          {cats.length === 0 ? <p className="text-sm text-ink-mute">No spending recorded yet.</p> : (
            <div className="space-y-3.5">
              {cats.map(([cat, v]) => {
                const used = v.planned > 0 ? (v.actual / v.planned) * 100 : v.actual > 0 ? 100 : 0;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-sm"><span>{cat}</span><span className="num text-ink-mute"><span className={cx("font-semibold", used > 100 ? "text-alert-500" : "text-ink")}>{money(v.actual)}</span> / {money(v.planned)}</span></div>
                    <Progress value={used} tone={used > 100 ? "bad" : used > 85 ? "warn" : "good"} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Savings goals" action={<Link to="/savings" className="text-xs font-semibold text-pulse-500 hover:underline">All goals</Link>} />
          {data.goals.length === 0 ? <Empty title="No goals yet" body="Set a target and a monthly amount — we'll forecast the date you'll hit it." action={<Link to="/savings"><Button size="sm">Add a goal</Button></Link>} /> : (
            <div className="space-y-4">
              {data.goals.slice(0, 4).map((g) => {
                const p = Number(g.target_amount) > 0 ? (Number(g.saved_amount) / Number(g.target_amount)) * 100 : 0;
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{g.name}</span><span className="num text-ink-mute">{money(Number(g.saved_amount))} / {money(Number(g.target_amount))}</span></div>
                    <Progress value={p} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-6 w-6 text-pulse-500" />
          <div>
            <h3 className="font-display text-2xl">Ask the advisor about {s.label}</h3>
            <p className="text-sm text-ink-mute">"Where should my extra $200 go?" — answered with your actual numbers.</p>
          </div>
        </div>
        <Link to="/advisor"><Button variant="secondary">Open advisor</Button></Link>
      </Card>
    </div>
  );
}
