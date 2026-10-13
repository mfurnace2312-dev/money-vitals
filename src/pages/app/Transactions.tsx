import { useMemo, useRef, useState } from "react";
import { Download, Plus, Search, Upload } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { usePlan } from "@/hooks/usePlan";
import { useToast } from "@/components/toast";
import { RecordForm, type FieldDef } from "@/components/RecordForm";
import { UpgradeGate } from "@/components/UpgradeGate";
import { BankConnections } from "@/components/BankConnections";
import { Button, Card, CardHeader, Empty, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, money, thisMonth, yearToDate, type Transaction } from "@/lib/finance";

const FIELDS: FieldDef[] = [
  { key: "description", label: "Description", type: "text", required: true, placeholder: "e.g. Kroger, Paycheck" },
  { key: "amount", label: "Amount", type: "money" },
  { key: "type", label: "Type", type: "select", options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }] },
  { key: "category", label: "Category", type: "select", options: [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "account", label: "Account (optional)", type: "text", placeholder: "e.g. Chase checking" },
  { key: "recurring", label: "Recurring", type: "toggle" },
];

const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export default function Transactions() {
  const { data, loading, insert, insertMany, update, remove } = useFinance();
  const plan = usePlan();
  const toast = useToast();
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { year } = thisMonth();
  const ytd = useMemo(() => yearToDate(data, year), [data, year]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? data.transactions.filter((t) => `${t.description} ${t.category} ${t.merchant ?? ""} ${t.account ?? ""}`.toLowerCase().includes(s)) : data.transactions;
  }, [data.transactions, q]);

  const exportCsv = () => {
    const head = ["date", "description", "category", "type", "amount", "account", "recurring"];
    const body = data.transactions.map((t) => [t.date, t.description, t.category, t.type, t.amount, t.account, t.recurring].map(csvCell).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `money-vitals-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return toast("That file has no rows to import.", "bad");
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
    const iDate = col("date"), iDesc = col("description", "name", "memo", "payee"), iAmt = col("amount"), iCat = col("category"), iType = col("type");
    if (iDate < 0 || iAmt < 0) return toast("The CSV needs at least a Date and an Amount column.", "bad");
    const out = rows.slice(1).map((r) => {
      const raw = Number(String(r[iAmt] ?? "").replace(/[$,\s]/g, ""));
      const d = new Date(r[iDate]);
      if (!Number.isFinite(raw) || Number.isNaN(d.getTime())) return null;
      const t = iType >= 0 ? String(r[iType]).toLowerCase() : raw < 0 ? "expense" : "income";
      return {
        date: d.toISOString().slice(0, 10),
        description: (iDesc >= 0 ? r[iDesc] : "Imported").trim() || "Imported",
        category: (iCat >= 0 && r[iCat]?.trim()) || (t.includes("inc") ? "Other Income" : "Miscellaneous"),
        amount: Math.abs(raw),
        type: t.includes("inc") || t.includes("credit") ? "income" : "expense",
      };
    }).filter(Boolean) as Record<string, unknown>[];
    if (!out.length) return toast("Couldn't read any rows — check the date and amount columns.", "bad");
    setBusy(true);
    const err = await insertMany("transactions", out.slice(0, 2000));
    setBusy(false);
    toast(err ?? `Imported ${Math.min(out.length, 2000)} transactions.`, err ? "bad" : "good");
  };

  if (loading) return <Spinner />;
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" sub="Individual purchases and deposits. Budget categories hold the monthly totals; this is the detail."
        action={
          <>
            {plan.hasPlus && (
              <>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
                <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busy}><Upload className="h-4 w-4" /> Import CSV</Button>
                <Button variant="secondary" onClick={exportCsv} disabled={!data.transactions.length}><Download className="h-4 w-4" /> Export</Button>
              </>
            )}
            <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add</Button>
          </>
        } />

      <BankConnections />

      <UpgradeGate need="plus" feature="Year-to-date analytics and CSV import/export">
        <Card>
          <CardHeader title={`${year} so far`} sub="From your monthly budgets, bills, debts and goals" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[["Income", ytd.income], ["Committed", ytd.committed], ["Saved", ytd.savings], ["Net cash flow", ytd.cashFlow]].map(([k, v]) => (
              <div key={k as string}><div className="eyebrow">{k}</div><div className={cx("num mt-1 text-xl font-semibold", (v as number) < 0 && "text-alert-500")}>{money(v as number)}</div></div>
            ))}
          </div>
        </Card>
      </UpgradeGate>

      {data.transactions.length === 0 ? (
        <Empty title="No transactions yet" body="Add purchases one at a time, or import a CSV export from your bank (Plus)." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add a transaction</Button>} />
      ) : (
        <Card pad={false}>
          <div className="border-b border-paper-line p-4 sm:px-6">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description, category, account" className="pl-9" aria-label="Search transactions" />
            </div>
          </div>
          <ul className="divide-y divide-paper-line">
            {list.slice(0, 300).map((t) => (
              <li key={t.id}><button onClick={() => setEditing(t)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper/50 sm:px-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-medium">{t.description}{t.pending && <span className="rounded bg-ink/5 px-1.5 text-[10px] font-semibold text-ink-mute">Pending</span>}</div>
                  <div className="text-xs text-ink-mute">{new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {t.category}{t.account ? ` · ${t.account}` : ""}</div>
                </div>
                <span className={cx("num shrink-0 text-sm font-semibold", t.type === "income" && "text-vital-600")}>{t.type === "income" ? "+" : "−"}{money(Number(t.amount), 2)}</span>
              </button></li>
            ))}
          </ul>
          {list.length > 300 && <p className="px-6 py-3 text-xs text-ink-mute">Showing the 300 most recent. Search to narrow down.</p>}
          {list.length === 0 && <p className="px-6 py-6 text-sm text-ink-mute">No matches for "{q}".</p>}
        </Card>
      )}

      <RecordForm open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit transaction" : "Add a transaction"} fields={FIELDS}
        initial={current ? { ...current, account: current.account ?? "" } : { description: "", amount: "", type: "expense", category: "Groceries", date: new Date().toISOString().slice(0, 10), account: "", recurring: false }}
        onSubmit={(v) => { const row = { ...v, account: v.account || null }; return current ? update("transactions", current.id, row) : insert("transactions", row); }}
        onDelete={current ? () => remove("transactions", current.id) : undefined} />
    </div>
  );
}
