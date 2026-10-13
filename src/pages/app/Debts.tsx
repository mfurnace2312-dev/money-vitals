import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinance } from "@/hooks/useFinance";
import { RecordForm, type FieldDef } from "@/components/RecordForm";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, PageHeader, Progress, Spinner, Stat, cx } from "@/components/ui";
import { DEBT_KINDS, calcDti, dtiBand, money, pct, simulatePayoff, summarizeMonth, thisMonth, type Debt, type Strategy } from "@/lib/finance";

const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Chase Freedom, Car loan" },
  { key: "kind", label: "Type", type: "select", options: DEBT_KINDS },
  { key: "balance", label: "Current balance", type: "money" },
  { key: "apr", label: "Interest rate (APR)", type: "percent", max: 100 },
  { key: "min_payment", label: "Minimum payment", type: "money" },
  { key: "actual_payment", label: "What you actually pay", type: "money", hint: "Leave 0 to use the minimum" },
  { key: "original_balance", label: "Original balance", type: "money", hint: "For your progress bar" },
  { key: "due_day", label: "Due day", type: "number", min: 1, max: 31 },
  { key: "is_housing", label: "This is a mortgage", type: "toggle", hint: "Mortgages are excluded from the payoff plan and counted as housing in DTI" },
];

export default function Debts() {
  const { data, loading, insert, update, remove } = useFinance();
  const [editing, setEditing] = useState<Debt | "new" | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [extra, setExtra] = useState(100);

  const payable = data.debts.filter((d) => !d.is_housing && Number(d.balance) > 0);
  const base = useMemo(() => simulatePayoff(data.debts, 0, strategy), [data.debts, strategy]);
  const plan = useMemo(() => simulatePayoff(data.debts, extra, strategy), [data.debts, extra, strategy]);
  const other = useMemo(() => simulatePayoff(data.debts, extra, strategy === "avalanche" ? "snowball" : "avalanche"), [data.debts, extra, strategy]);

  const totalBal = payable.reduce((a, d) => a + Number(d.balance), 0);
  const totalMin = payable.reduce((a, d) => a + Number(d.min_payment), 0);

  // DTI what-if: pay off one debt
  const { year, month1 } = thisMonth();
  const s = summarizeMonth(data, year, month1);
  const [grossOverride, setGross] = useState<string>("");
  const gross = grossOverride !== "" ? Number(grossOverride) : s.income;
  const [cleared, setCleared] = useState<string>("");
  const otherDebt = payable.filter((d) => d.id !== cleared).reduce((a, d) => a + Number(d.min_payment), 0);
  const dtiNow = calcDti(gross, s.housing, totalMin);
  const dtiWhatIf = calcDti(gross, s.housing, otherDebt);

  if (loading) return <Spinner />;
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Debt payoff" sub="See your real debt-free date — and how much faster a little extra gets you there." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add debt</Button>} />

      {data.debts.length === 0 ? (
        <Empty title="No debts added" body="Add credit cards, loans, and your mortgage. We'll build a payoff timeline and calculate your debt-to-income ratio." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add a debt</Button>} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><Stat label="Total owed (excl. mortgage)" value={money(totalBal)} sub={`${payable.length} debts · ${money(totalMin)}/mo minimums`} /></Card>
            <Card><Stat label="Debt-free with your plan" value={plan.months ? plan.freeDate : "—"} tone="good" sub={plan.months ? `${plan.months} months · ${money(plan.interest)} interest` : undefined} /></Card>
            <Card><Stat label="You save vs minimums" value={money(Math.max(0, base.interest - plan.interest))} tone="good" sub={`${Math.max(0, base.months - plan.months)} months sooner`} /></Card>
          </div>

          {payable.length > 0 && (
            <Card>
              <CardHeader title="Your payoff plan" sub="Freed-up minimums roll into the next debt automatically" />
              <div className="mb-6 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-ink-soft">Strategy</div>
                  <div className="inline-flex rounded-lg border border-paper-line bg-paper p-1">
                    {(["avalanche", "snowball"] as Strategy[]).map((k) => (
                      <button key={k} onClick={() => setStrategy(k)} aria-pressed={strategy === k}
                        className={cx("rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition", strategy === k ? "bg-white shadow-sm" : "text-ink-mute")}>{k}</button>
                    ))}
                  </div>
                  <p className="mt-1.5 max-w-xs text-xs text-ink-mute">{strategy === "avalanche" ? "Highest interest first — least total interest." : "Smallest balance first — quickest early wins."}</p>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-soft"><span>Extra per month</span><span className="num text-ink">{money(extra)}</span></div>
                  <input type="range" min={0} max={2000} step={25} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-full accent-[#3D2BFF]" aria-label="Extra payment per month" />
                  <p className="mt-1 text-xs text-ink-mute">
                    {strategy === "avalanche" ? "Snowball" : "Avalanche"} would take {other.months} months and cost {money(other.interest)} in interest
                    {other.interest > plan.interest ? ` — ${money(other.interest - plan.interest)} more.` : other.interest < plan.interest ? ` — ${money(plan.interest - other.interest)} less.` : "."}
                  </p>
                </div>
              </div>

              {plan.capped && <p className="mb-4 rounded-lg bg-alert-50 px-3 py-2 text-sm text-alert-500">At these payments the balance doesn't shrink. Raise a minimum or the extra amount.</p>}

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={plan.timeline}>
                    <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3D2BFF" stopOpacity={0.25} /><stop offset="1" stopColor="#3D2BFF" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="#E3E1F5" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="#6E6A94" interval="preserveStartEnd" minTickGap={30} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#6E6A94" width={52} tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
                    <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #E3E1F5", fontSize: 13 }} />
                    <Area type="monotone" dataKey="balance" name="Balance left" stroke="#3D2BFF" strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <ol className="mt-5 space-y-2">
                {plan.order.map((o, i) => (
                  <li key={o.id} className="flex items-center justify-between rounded-lg bg-paper/70 px-3 py-2 text-sm">
                    <span><span className="num mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>{o.name}</span>
                    <span className="num text-ink-mute">paid off in {o.month} mo · {money(o.interest)} interest</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card pad={false}>
            <div className="px-5 pt-5 sm:px-6"><CardHeader title="All debts" sub="Tap a debt to edit it" /></div>
            <ul className="divide-y divide-paper-line border-t border-paper-line">
              {data.debts.map((d) => {
                const orig = Number(d.original_balance) || Number(d.balance);
                const paidPct = orig > 0 ? ((orig - Number(d.balance)) / orig) * 100 : 0;
                return (
                  <li key={d.id}>
                    <button onClick={() => setEditing(d)} className="w-full px-5 py-3.5 text-left hover:bg-paper/50 sm:px-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold">{d.name} {d.is_housing && <Badge>Mortgage</Badge>}</div>
                          <div className="mt-0.5 text-xs text-ink-mute">{d.kind} · {pct(Number(d.apr), 2)} APR · {money(Number(d.min_payment))}/mo min</div>
                        </div>
                        <span className="num text-sm font-semibold">{money(Number(d.balance))}</span>
                      </div>
                      {orig > 0 && <div className="mt-2"><Progress value={paidPct} /></div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Debt-to-income what-if" sub="Uses gross monthly income — the way lenders calculate it" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gross monthly income" hint={grossOverride === "" ? "Using this month's recorded income" : undefined}>
                <Input type="number" inputMode="decimal" placeholder={String(Math.round(s.income))} value={grossOverride} onChange={(e) => setGross(e.target.value)} />
              </Field>
              <Field label="What if I paid off…">
                <select className="input" value={cleared} onChange={(e) => setCleared(e.target.value)}>
                  <option value="">Nothing — show today</option>
                  {payable.map((d) => <option key={d.id} value={d.id}>{d.name} ({money(Number(d.min_payment))}/mo)</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-paper-line p-4">
                <div className="eyebrow">Back-end DTI today</div>
                <div className="num mt-1 text-3xl font-semibold">{pct(dtiNow.back)}</div>
                <div className="mt-2"><Badge tone={dtiBand(dtiNow.back).tone}>{dtiBand(dtiNow.back).label}</Badge></div>
              </div>
              <div className={cx("rounded-xl border p-4", cleared ? "border-vital-400 bg-vital-50" : "border-paper-line")}>
                <div className="eyebrow">{cleared ? "After paying it off" : "Front-end (housing only)"}</div>
                <div className="num mt-1 text-3xl font-semibold">{pct(cleared ? dtiWhatIf.back : dtiNow.front)}</div>
                <div className="mt-2"><Badge tone={dtiBand(cleared ? dtiWhatIf.back : dtiNow.front).tone}>{dtiBand(cleared ? dtiWhatIf.back : dtiNow.front).label}</Badge></div>
              </div>
            </div>
            {gross <= 0 && <p className="mt-3 text-xs text-ink-mute">Enter your gross monthly income to calculate DTI.</p>}
          </Card>
        </>
      )}

      <RecordForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? `Edit ${current.name}` : "Add a debt"}
        fields={FIELDS}
        initial={current ? { ...current } : { name: "", kind: "Credit Card", balance: "", apr: "", min_payment: "", actual_payment: "", original_balance: "", due_day: 1, is_housing: false }}
        onSubmit={(v) => {
          const row = { ...v, original_balance: Number(v.original_balance) || Number(v.balance) };
          return current ? update("debts", current.id, row) : insert("debts", row);
        }}
        onDelete={current ? () => remove("debts", current.id) : undefined}
      />
    </div>
  );
}
