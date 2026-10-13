import { useMemo, useState } from "react";
import { Copy, Home, Plus, Zap } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { useMonth } from "@/hooks/useMonth";
import { useToast } from "@/components/toast";
import { RecordForm, type FieldDef } from "@/components/RecordForm";
import { Badge, Button, Card, Empty, PageHeader, Progress, Spinner, Toggle, cx } from "@/components/ui";
import { BILL_CATEGORIES, money, monthKey, shiftMonth, type Bill } from "@/lib/finance";

const FIELDS: FieldDef[] = [
  { key: "name", label: "Bill name", type: "text", required: true, placeholder: "e.g. Rent, Electric, Phone" },
  { key: "amount", label: "Amount", type: "money" },
  { key: "due_day", label: "Due day of month", type: "number", min: 1, max: 31 },
  { key: "category", label: "Category", type: "select", options: BILL_CATEGORIES },
  { key: "frequency", label: "How often", type: "select", options: [{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }] },
  { key: "is_housing", label: "This is rent or mortgage", type: "toggle", hint: "Used for front-end DTI" },
  { key: "essential", label: "Essential", type: "toggle", hint: "Counts toward your emergency-fund target" },
  { key: "autopay", label: "On autopay", type: "toggle" },
];

export default function Bills() {
  const { data, loading, insert, insertMany, update, remove } = useFinance();
  const m = useMonth();
  const toast = useToast();
  const [editing, setEditing] = useState<Bill | "new" | null>(null);
  const [copying, setCopying] = useState(false);

  const bills = useMemo(() => data.bills.filter((b) => b.month === m.key).sort((a, b) => a.due_day - b.due_day), [data.bills, m.key]);
  const total = bills.reduce((a, b) => a + Number(b.amount), 0);
  const paid = bills.filter((b) => b.paid).reduce((a, b) => a + Number(b.amount), 0);
  const today = new Date().getDate();

  const prev = shiftMonth(m.year, m.month1, -1);
  const prevBills = data.bills.filter((b) => b.month === monthKey(prev.year, prev.month1));

  const copyLast = async () => {
    const have = new Set(bills.map((b) => b.name.toLowerCase()));
    const rows = prevBills
      .filter((b) => !have.has(b.name.toLowerCase()))
      .map((b) => ({
        month: m.key, paid: false, name: b.name, category: b.category, amount: b.amount, due_day: b.due_day,
        autopay: b.autopay, frequency: b.frequency, account: b.account, is_housing: b.is_housing, essential: b.essential,
      }));
    if (!rows.length) return toast("This month already has all of last month's bills.");
    setCopying(true);
    const err = await insertMany("bills", rows);
    setCopying(false);
    toast(err ?? `Copied ${rows.length} bills — all marked unpaid.`, err ? "bad" : "good");
  };

  const togglePaid = async (b: Bill) => {
    const err = await update("bills", b.id, { paid: !b.paid });
    if (err) toast(err, "bad");
  };

  if (loading) return <Spinner />;
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div>
      <PageHeader
        title="Bills"
        sub="Recurring bills for the month. Tap the switch when one is paid."
        action={
          <>
            {prevBills.length > 0 && <Button variant="secondary" onClick={copyLast} loading={copying}><Copy className="h-4 w-4" /> Copy last month</Button>}
            <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add bill</Button>
          </>
        }
      />

      {bills.length > 0 && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="eyebrow">Paid this month</div>
              <div className="num mt-1 text-2xl font-semibold">{money(paid)} <span className="text-base font-normal text-ink-mute">of {money(total)}</span></div>
            </div>
            <div className="text-sm text-ink-mute"><span className="num font-semibold text-ink">{money(total - paid)}</span> still to pay</div>
          </div>
          <div className="mt-3"><Progress value={total ? (paid / total) * 100 : 0} /></div>
        </Card>
      )}

      {bills.length === 0 ? (
        <Empty title={`No bills for ${m.label}`} body="Add rent, utilities, phone, insurance — anything that comes due every month."
          action={prevBills.length ? <Button onClick={copyLast} loading={copying}><Copy className="h-4 w-4" /> Copy last month's bills</Button> : <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add your first bill</Button>} />
      ) : (
        <Card pad={false}>
          <ul className="divide-y divide-paper-line">
            {bills.map((b) => {
              const late = m.isCurrent && !b.paid && b.due_day < today;
              const soon = m.isCurrent && !b.paid && b.due_day >= today && b.due_day - today <= 3;
              return (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <Toggle checked={b.paid} onChange={() => togglePaid(b)} label={`Mark ${b.name} ${b.paid ? "unpaid" : "paid"}`} />
                  <button onClick={() => setEditing(b)} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <div className={cx("flex items-center gap-2 truncate text-sm font-semibold", b.paid && "text-ink-mute line-through")}>
                        {b.is_housing && <Home className="h-3.5 w-3.5 shrink-0 text-ink-mute" aria-label="Housing" />}
                        {b.name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
                        <span>Due day {b.due_day}</span>·<span>{b.category}</span>
                        {b.autopay && <Badge><Zap className="mr-0.5 h-3 w-3" />Autopay</Badge>}
                        {late && <Badge tone="bad">Past due</Badge>}
                        {soon && <Badge tone="warn">Due soon</Badge>}
                      </div>
                    </div>
                    <span className="num shrink-0 text-sm font-semibold">{money(Number(b.amount), 2)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <RecordForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? `Edit ${current.name}` : "Add a bill"}
        fields={FIELDS}
        initial={current ? { ...current } : { name: "", amount: "", due_day: 1, category: "Utilities", frequency: "monthly", is_housing: false, essential: true, autopay: false }}
        onSubmit={(v) => (current ? update("bills", current.id, v) : insert("bills", { ...v, month: m.key, paid: false }))}
        onDelete={current ? () => remove("bills", current.id) : undefined}
      />
    </div>
  );
}
