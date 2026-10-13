import { useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { useMonth } from "@/hooks/useMonth";
import { useToast } from "@/components/toast";
import { InlineMoney } from "@/components/InlineMoney";
import { RecordForm } from "@/components/RecordForm";
import { Button, Card, Empty, PageHeader, Progress, Spinner, cx } from "@/components/ui";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, money, monthKey, shiftMonth, summarizeMonth, type BudgetEntry, type Kind } from "@/lib/finance";

function Section({ kind, rows }: { kind: Kind; rows: BudgetEntry[] }) {
  const { update, remove } = useFinance();
  const toast = useToast();
  const planned = rows.reduce((a, r) => a + Number(r.planned), 0);
  const actual = rows.reduce((a, r) => a + Number(r.actual), 0);
  const save = async (id: string, patch: Partial<BudgetEntry>) => {
    const err = await update("entries", id, patch);
    if (err) toast(err, "bad");
  };
  const del = async (r: BudgetEntry) => {
    const err = await remove("entries", r.id);
    toast(err ?? `Removed ${r.category}`, err ? "bad" : "good");
  };

  return (
    <Card pad={false}>
      <div className="grid grid-cols-[1fr_100px_100px_32px] items-center gap-2 border-b border-paper-line px-4 py-3 text-sm font-bold text-ink-soft sm:grid-cols-[1fr_130px_130px_36px] sm:px-6">
        <span>{kind === "income" ? "Income" : "Expenses"}</span>
        <span className="text-right">Planned</span>
        <span className="text-right">Actual</span>
        <span />
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-6 text-sm text-ink-mute">Nothing here yet.</p>
      ) : (
        <ul>
          {rows.map((r) => {
            const over = kind === "expense" && Number(r.planned) > 0 && Number(r.actual) > Number(r.planned);
            return (
              <li key={r.id} className="group grid grid-cols-[1fr_100px_100px_32px] items-center gap-2 border-b border-paper-line/70 px-4 py-1.5 last:border-0 sm:grid-cols-[1fr_130px_130px_36px] sm:px-6">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.category}</div>
                  {kind === "expense" && Number(r.planned) > 0 && (
                    <div className="mt-1 max-w-[180px]"><Progress value={(Number(r.actual) / Number(r.planned)) * 100} tone={over ? "bad" : "good"} /></div>
                  )}
                </div>
                <InlineMoney value={Number(r.planned)} label={`${r.category} planned`} onSave={(v) => save(r.id, { planned: v })} />
                <InlineMoney value={Number(r.actual)} label={`${r.category} actual`} onSave={(v) => save(r.id, { actual: v })} className={cx(over && "[&_input]:text-alert-500")} />
                <button onClick={() => del(r)} className="rounded-md p-1.5 text-ink-mute opacity-60 hover:bg-alert-50 hover:text-alert-500 group-hover:opacity-100" aria-label={`Remove ${r.category}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 rounded-b-xl2 bg-paper/60 px-4 py-3 text-sm font-semibold sm:grid-cols-[1fr_130px_130px_36px] sm:px-6">
        <span>Total</span>
        <span className="num pr-2 text-right">{money(planned)}</span>
        <span className="num pr-2 text-right">{money(actual)}</span>
        <span />
      </div>
    </Card>
  );
}

export default function Budget() {
  const { data, loading, insert, insertMany } = useFinance();
  const m = useMonth();
  const toast = useToast();
  const [adding, setAdding] = useState<Kind | null>(null);
  const [copying, setCopying] = useState(false);

  const rows = useMemo(() => data.entries.filter((e) => e.month === m.key), [data.entries, m.key]);
  const income = rows.filter((r) => r.kind === "income");
  const expense = rows.filter((r) => r.kind === "expense");
  const s = useMemo(() => summarizeMonth(data, m.year, m.month1), [data, m.year, m.month1]);

  const prev = shiftMonth(m.year, m.month1, -1);
  const prevKey = monthKey(prev.year, prev.month1);
  const prevRows = data.entries.filter((e) => e.month === prevKey);

  const copyLast = async () => {
    const have = new Set(rows.map((r) => `${r.kind}:${r.category}`));
    const toAdd = prevRows.filter((r) => !have.has(`${r.kind}:${r.category}`)).map((r) => ({ month: m.key, kind: r.kind, category: r.category, planned: r.planned, actual: 0 }));
    if (toAdd.length === 0) return toast("This month already has every category from last month.");
    setCopying(true);
    const err = await insertMany("entries", toAdd);
    setCopying(false);
    toast(err ?? `Copied ${toAdd.length} categories from last month's plan.`, err ? "bad" : "good");
  };

  if (loading) return <Spinner />;

  const used = new Set(rows.filter((r) => r.kind === adding).map((r) => r.category));
  const options = (adding === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).filter((c) => !used.has(c));

  return (
    <div>
      <PageHeader
        title="Budget"
        sub={<>Plan each category, then fill in what actually happened. Click any amount to edit.</>}
        action={
          <>
            {prevRows.length > 0 && <Button variant="secondary" onClick={copyLast} loading={copying}><Copy className="h-4 w-4" /> Copy last month's plan</Button>}
            <Button variant="secondary" onClick={() => setAdding("income")}><Plus className="h-4 w-4" /> Income</Button>
            <Button onClick={() => setAdding("expense")}><Plus className="h-4 w-4" /> Expense</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Income", money(s.income)], ["Spending", money(s.expenses)], ["Bills & debt", money(s.bills + s.debtPayments)], ["Left after all", money(s.moneyLeft)]].map(([k, v], i) => (
          <div key={k} className="rounded-2xl border-2 border-ink/[.06] bg-white px-4 py-3">
            <div className="eyebrow">{k}</div>
            <div className={cx("num mt-1 text-xl font-semibold", i === 3 && s.moneyLeft < 0 && "text-alert-500")}>{v}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty
          title={`No budget for ${m.label} yet`}
          body={prevRows.length ? "Copy last month's categories to get started in one click, or add them one at a time." : "Add your income first, then the categories you spend on."}
          action={prevRows.length ? <Button onClick={copyLast} loading={copying}><Copy className="h-4 w-4" /> Copy last month's plan</Button> : <Button onClick={() => setAdding("income")}><Plus className="h-4 w-4" /> Add income</Button>}
        />
      ) : (
        <div className="space-y-5">
          <Section kind="income" rows={income} />
          <Section kind="expense" rows={expense} />
          <p className="text-xs text-ink-mute">Bills, debt payments and savings contributions are tracked on their own pages and counted in "Left after all".</p>
        </div>
      )}

      <RecordForm
        open={adding !== null}
        onClose={() => setAdding(null)}
        title={adding === "income" ? "Add income" : "Add an expense category"}
        submitLabel="Add"
        fields={[
          options.length
            ? { key: "category", label: "Category", type: "select", options: [...options, "Custom…"] }
            : { key: "category", label: "Category", type: "text", required: true },
          { key: "custom", label: "Custom name (if Custom…)", type: "text", placeholder: "e.g. Pet care" },
          { key: "planned", label: "Planned", type: "money" },
          { key: "actual", label: "Actual so far", type: "money" },
        ]}
        initial={{ category: options[0] ?? "", custom: "", planned: "", actual: "" }}
        onSubmit={async (v) => {
          const category = v.category === "Custom…" || !v.category ? String(v.custom || "").trim() : String(v.category);
          if (!category) return "Give the category a name.";
          if (rows.some((r) => r.kind === adding && r.category.toLowerCase() === category.toLowerCase())) return `${category} is already in this month.`;
          return insert("entries", { month: m.key, kind: adding, category, planned: v.planned, actual: v.actual });
        }}
      />
    </div>
  );
}
