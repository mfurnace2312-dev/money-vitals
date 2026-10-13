import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { RecordForm, type FieldDef } from "@/components/RecordForm";
import { Card, CardHeader, Empty, PageHeader, Progress, Spinner, Button, Badge } from "@/components/ui";
import { GOAL_CATEGORIES, emergencyFund, goalEta, goalNeeded, money, summarizeMonth, thisMonth, type SavingsGoal } from "@/lib/finance";

const FIELDS: FieldDef[] = [
  { key: "name", label: "Goal name", type: "text", required: true, placeholder: "e.g. Emergency fund, New car" },
  { key: "category", label: "Type", type: "select", options: GOAL_CATEGORIES },
  { key: "target_amount", label: "Target amount", type: "money" },
  { key: "saved_amount", label: "Saved so far", type: "money" },
  { key: "monthly_contribution", label: "Monthly contribution", type: "money" },
  { key: "target_date", label: "Target date (optional)", type: "date" },
];

export default function Savings() {
  const { data, loading, insert, update, remove } = useFinance();
  const [editing, setEditing] = useState<SavingsGoal | "new" | null>(null);
  const { year, month1 } = thisMonth();
  const s = useMemo(() => summarizeMonth(data, year, month1), [data, year, month1]);
  const efGoal = data.goals.find((g) => g.category === "Emergency Fund" || /emergency/i.test(g.name));
  const ef = emergencyFund(s.essentials, efGoal ? Number(efGoal.saved_amount) : 0);
  const totalSaved = data.goals.reduce((a, g) => a + Number(g.saved_amount), 0);
  const totalMonthly = data.goals.reduce((a, g) => a + Number(g.monthly_contribution), 0);

  if (loading) return <Spinner />;
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Savings goals" sub={<>{money(totalSaved)} saved across {data.goals.length} goals · {money(totalMonthly)}/month going in</>}
        action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add goal</Button>} />

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-vital-600" />Emergency fund</span>}
          sub={s.essentials > 0 ? <>Your essentials run about <span className="num font-semibold text-ink">{money(s.essentials)}</span>/month (essential bills + groceries, transport, insurance…)</> : "Add essential bills and expenses this month to size your target."} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div><div className="eyebrow">Covered</div><div className="num mt-1 text-3xl font-semibold">{ef.covered.toFixed(1)} <span className="text-base font-normal text-ink-mute">months</span></div></div>
          <div><div className="eyebrow">3-month target</div><div className="num mt-1 text-xl font-semibold">{money(ef.three)}</div></div>
          <div><div className="eyebrow">6-month target</div><div className="num mt-1 text-xl font-semibold">{money(ef.six)}</div></div>
        </div>
        <div className="mt-4"><Progress value={(ef.covered / 6) * 100} tone={ef.covered >= 3 ? "good" : ef.covered >= 1 ? "warn" : "bad"} /></div>
        {!efGoal && <p className="mt-3 text-xs text-ink-mute">Tip: name a goal "Emergency fund" (or choose that type) and it'll be tracked here automatically.</p>}
      </Card>

      {data.goals.length === 0 ? (
        <Empty title="No goals yet" body="Add what you're saving for. We'll show what you need each month and when you'll get there." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add your first goal</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.goals.map((g) => {
            const p = Number(g.target_amount) > 0 ? (Number(g.saved_amount) / Number(g.target_amount)) * 100 : 0;
            const need = goalNeeded(g);
            const behind = need !== null && Number(g.monthly_contribution) < need - 0.5;
            return (
              <button key={g.id} onClick={() => setEditing(g)} className="text-left">
                <Card className="h-full transition hover:border-ink/25">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-xs text-ink-mute">{g.category}</div>
                    </div>
                    {p >= 100 ? <Badge tone="good">Reached</Badge> : behind ? <Badge tone="warn">Behind pace</Badge> : null}
                  </div>
                  <div className="num mt-4 text-2xl font-semibold">{money(Number(g.saved_amount))} <span className="text-sm font-normal text-ink-mute">of {money(Number(g.target_amount))}</span></div>
                  <div className="mt-3"><Progress value={p} /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div><div className="text-ink-mute">Projected</div><div className="mt-0.5 font-semibold">{goalEta(g)}</div></div>
                    <div><div className="text-ink-mute">{need !== null ? "Needed / month" : "Contributing"}</div><div className="num mt-0.5 font-semibold">{money(need ?? Number(g.monthly_contribution))}</div></div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <RecordForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? `Edit ${current.name}` : "Add a savings goal"}
        fields={FIELDS}
        initial={current ? { ...current, target_date: current.target_date ?? "" } : { name: "", category: "Savings", target_amount: "", saved_amount: "", monthly_contribution: "", target_date: "" }}
        onSubmit={(v) => (current ? update("goals", current.id, v) : insert("goals", v))}
        onDelete={current ? () => remove("goals", current.id) : undefined}
      />
    </div>
  );
}
