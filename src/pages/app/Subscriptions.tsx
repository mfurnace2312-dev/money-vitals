import { useState } from "react";
import { Plus, Radar } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { RecordForm, type FieldDef } from "@/components/RecordForm";
import { UpgradeGate } from "@/components/UpgradeGate";
import { Button, Card, CardHeader, Empty, PageHeader, Spinner, Stat } from "@/components/ui";
import { SUB_CATEGORIES, money, subscriptionTotals, type Subscription } from "@/lib/finance";

const FIELDS: FieldDef[] = [
  { key: "name", label: "Service", type: "text", required: true, placeholder: "e.g. Netflix, Spotify, iCloud" },
  { key: "price", label: "Price", type: "money" },
  { key: "frequency", label: "Billed", type: "select", options: [{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }, { value: "weekly", label: "Weekly" }] },
  { key: "category", label: "Category", type: "select", options: SUB_CATEGORIES },
  { key: "next_payment", label: "Next payment date", type: "date" },
];

const monthlyOf = (s: Subscription) => (s.frequency === "yearly" ? Number(s.price) / 12 : s.frequency === "weekly" ? (Number(s.price) * 52) / 12 : Number(s.price));

export default function Subscriptions() {
  const { data, loading, insert, update, remove } = useFinance();
  const [editing, setEditing] = useState<Subscription | "new" | null>(null);
  const t = subscriptionTotals(data.subscriptions);

  if (loading) return <Spinner />;
  const current = editing && editing !== "new" ? editing : null;

  const byCat = Object.entries(
    data.subscriptions.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.category]: (acc[s.category] ?? 0) + monthlyOf(s) }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const dupes = byCat.filter(([cat]) => data.subscriptions.filter((s) => s.category === cat).length > 1);
  const soon = data.subscriptions
    .filter((s) => s.next_payment && (Date.parse(s.next_payment) - Date.now()) / 864e5 <= 7 && Date.parse(s.next_payment) >= Date.now() - 864e5)
    .sort((a, b) => Date.parse(a.next_payment!) - Date.parse(b.next_payment!));

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" sub="Small charges add up. Keep every recurring service in one list." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add subscription</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><Stat label="Per month" value={money(t.monthly, 2)} /></Card>
        <Card><Stat label="Per year" value={money(t.yearly)} /></Card>
        <Card><Stat label="Active" value={data.subscriptions.length} /></Card>
      </div>

      {data.subscriptions.length === 0 ? (
        <Empty title="No subscriptions tracked" body="Add streaming, apps, memberships — anything that renews automatically." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add one</Button>} />
      ) : (
        <>
          <UpgradeGate need="plus" feature="Subscription radar">
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><Radar className="h-4 w-4 text-vital-600" />Subscription radar</span>} sub="Where to look first if you want to cut back" />
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <div className="eyebrow mb-2">Biggest categories</div>
                  <ul className="space-y-1.5 text-sm">{byCat.slice(0, 4).map(([c, v]) => <li key={c} className="flex justify-between"><span>{c}</span><span className="num font-semibold">{money(v, 2)}/mo</span></li>)}</ul>
                </div>
                <div>
                  <div className="eyebrow mb-2">Possible overlap</div>
                  {dupes.length ? <ul className="space-y-1.5 text-sm">{dupes.map(([c]) => <li key={c}>{data.subscriptions.filter((s) => s.category === c).length} services in {c}</li>)}</ul> : <p className="text-sm text-ink-mute">No overlapping categories.</p>}
                </div>
                <div>
                  <div className="eyebrow mb-2">Renewing in 7 days</div>
                  {soon.length ? <ul className="space-y-1.5 text-sm">{soon.map((s) => <li key={s.id} className="flex justify-between"><span>{s.name}</span><span className="text-ink-mute">{new Date(s.next_payment! + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></li>)}</ul> : <p className="text-sm text-ink-mute">Nothing renewing this week.</p>}
                </div>
              </div>
            </Card>
          </UpgradeGate>

          <Card pad={false}>
            <ul className="divide-y divide-paper-line">
              {data.subscriptions.map((s) => (
                <li key={s.id}><button onClick={() => setEditing(s)} className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-paper/50 sm:px-6">
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-mute">{s.category} · {s.frequency}{s.next_payment ? ` · next ${new Date(s.next_payment + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm font-semibold">{money(Number(s.price), 2)}</div>
                    {s.frequency !== "monthly" && <div className="num text-xs text-ink-mute">{money(monthlyOf(s), 2)}/mo</div>}
                  </div>
                </button></li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <RecordForm open={editing !== null} onClose={() => setEditing(null)} title={current ? `Edit ${current.name}` : "Add a subscription"} fields={FIELDS}
        initial={current ? { ...current, next_payment: current.next_payment ?? "" } : { name: "", price: "", frequency: "monthly", category: "Streaming", next_payment: "" }}
        onSubmit={(v) => (current ? update("subscriptions", current.id, v) : insert("subscriptions", v))}
        onDelete={current ? () => remove("subscriptions", current.id) : undefined} />
    </div>
  );
}
