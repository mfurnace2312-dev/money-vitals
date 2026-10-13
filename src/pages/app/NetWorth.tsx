import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { RecordForm, type FieldDef } from "@/components/RecordForm";
import { Button, Card, CardHeader, PageHeader, Spinner, cx } from "@/components/ui";
import { ASSET_CATEGORIES, money, netWorth, type Asset, type Liability } from "@/lib/finance";

const ASSET_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Checking, 401(k), Car" },
  { key: "category", label: "Type", type: "select", options: ASSET_CATEGORIES },
  { key: "value", label: "Current value", type: "money" },
];
const LIAB_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Money owed to family, Tax bill" },
  { key: "category", label: "Type", type: "select", options: ["Personal", "Taxes", "Medical", "Other"] },
  { key: "amount", label: "Amount owed", type: "money" },
];

export default function NetWorth() {
  const { data, loading, insert, update, remove } = useFinance();
  const [asset, setAsset] = useState<Asset | "new" | null>(null);
  const [liab, setLiab] = useState<Liability | "new" | null>(null);
  const nw = netWorth(data);

  if (loading) return <Spinner />;
  const a = asset && asset !== "new" ? asset : null;
  const l = liab && liab !== "new" ? liab : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Net worth" sub="What you own minus what you owe. Debts from Debt payoff are included automatically." />

      <Card className="border-0 bg-ink text-white">
        <div className="text-sm font-medium text-white/70">Net worth</div>
        <div className={cx("num mt-1 font-display text-6xl", nw.net < 0 && "text-alert-300")}>{money(nw.net)}</div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-4 text-sm">
          <div><span className="text-white/50">Assets </span><span className="num font-semibold">{money(nw.assets)}</span></div>
          <div><span className="text-white/50">Debts </span><span className="num font-semibold">{money(nw.debts)}</span></div>
          <div><span className="text-white/50">Other liabilities </span><span className="num font-semibold">{money(nw.other)}</span></div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <div className="px-5 pt-5 sm:px-6"><CardHeader title="Assets" sub={money(nw.assets)} action={<Button size="sm" onClick={() => setAsset("new")}><Plus className="h-3.5 w-3.5" /> Add</Button>} /></div>
          {data.assets.length === 0 ? <p className="px-6 pb-6 text-sm text-ink-mute">Add cash, retirement accounts, home equity, vehicles…</p> : (
            <ul className="divide-y divide-paper-line border-t border-paper-line">
              {data.assets.map((x) => (
                <li key={x.id}><button onClick={() => setAsset(x)} className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-paper/50 sm:px-6">
                  <span><span className="font-medium">{x.name}</span> <span className="text-xs text-ink-mute">· {x.category}</span></span>
                  <span className="num font-semibold">{money(Number(x.value))}</span>
                </button></li>
              ))}
            </ul>
          )}
        </Card>

        <Card pad={false}>
          <div className="px-5 pt-5 sm:px-6"><CardHeader title="Liabilities" sub={money(nw.liabilities)} action={<Button size="sm" variant="secondary" onClick={() => setLiab("new")}><Plus className="h-3.5 w-3.5" /> Other</Button>} /></div>
          <ul className="divide-y divide-paper-line border-t border-paper-line">
            {data.debts.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3 text-sm sm:px-6">
                <span><span className="font-medium">{d.name}</span> <span className="text-xs text-ink-mute">· {d.kind} (from Debt payoff)</span></span>
                <span className="num font-semibold">{money(Number(d.balance))}</span>
              </li>
            ))}
            {data.liabilities.map((x) => (
              <li key={x.id}><button onClick={() => setLiab(x)} className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-paper/50 sm:px-6">
                <span><span className="font-medium">{x.name}</span> <span className="text-xs text-ink-mute">· {x.category}</span></span>
                <span className="num font-semibold">{money(Number(x.amount))}</span>
              </button></li>
            ))}
            {data.debts.length + data.liabilities.length === 0 && <li className="px-6 py-4 text-sm text-ink-mute">Nothing owed. Nice.</li>}
          </ul>
        </Card>
      </div>

      <RecordForm open={asset !== null} onClose={() => setAsset(null)} title={a ? `Edit ${a.name}` : "Add an asset"} fields={ASSET_FIELDS}
        initial={a ? { ...a } : { name: "", category: "Checking", value: "" }}
        onSubmit={(v) => (a ? update("assets", a.id, v) : insert("assets", v))} onDelete={a ? () => remove("assets", a.id) : undefined} />
      <RecordForm open={liab !== null} onClose={() => setLiab(null)} title={l ? `Edit ${l.name}` : "Add a liability"} fields={LIAB_FIELDS}
        initial={l ? { ...l } : { name: "", category: "Other", amount: "" }}
        onSubmit={(v) => (l ? update("liabilities", l.id, v) : insert("liabilities", v))} onDelete={l ? () => remove("liabilities", l.id) : undefined} />
    </div>
  );
}
