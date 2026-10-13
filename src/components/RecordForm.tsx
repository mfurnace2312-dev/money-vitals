import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, Modal, Select, Toggle } from "./ui";

export type FieldDef =
  | { key: string; label: string; type: "text"; required?: boolean; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "money" | "number" | "percent"; required?: boolean; min?: number; max?: number; step?: number; hint?: string }
  | { key: string; label: string; type: "date"; required?: boolean; hint?: string }
  | { key: string; label: string; type: "select"; options: (string | { value: string; label: string })[]; hint?: string }
  | { key: string; label: string; type: "toggle"; hint?: string };

type Values = Record<string, string | number | boolean | null>;

export function RecordForm({
  open, onClose, title, fields, initial, onSubmit, onDelete, submitLabel = "Save",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  initial: Values;
  onSubmit: (values: Values) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { if (open) { setValues(initial); setErr(null); setConfirmDelete(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: Values[string]) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const out: Values = {};
    for (const f of fields) {
      const raw = values[f.key];
      if (f.type === "money" || f.type === "number" || f.type === "percent") {
        const num = raw === "" || raw === null || raw === undefined ? 0 : Number(raw);
        if (!Number.isFinite(num)) return setErr(`${f.label} must be a number.`);
        if (f.min !== undefined && num < f.min) return setErr(`${f.label} can't be less than ${f.min}.`);
        if (f.max !== undefined && num > f.max) return setErr(`${f.label} can't be more than ${f.max}.`);
        out[f.key] = num;
      } else if (f.type === "text") {
        const s = String(raw ?? "").trim();
        if (f.required && !s) return setErr(`${f.label} is required.`);
        out[f.key] = s;
      } else if (f.type === "date") {
        const s = String(raw ?? "");
        if (f.required && !s) return setErr(`${f.label} is required.`);
        out[f.key] = s || null;
      } else {
        out[f.key] = raw ?? null;
      }
    }
    setBusy(true);
    const error = await onSubmit(out);
    setBusy(false);
    if (error) setErr(error); else onClose();
  };

  const doDelete = async () => {
    if (!onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    const error = await onDelete();
    setBusy(false);
    if (error) setErr(error); else onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const wide = f.type === "text" || f.type === "toggle";
            const v = values[f.key];
            if (f.type === "toggle") {
              return (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-paper-line px-3 py-2.5 sm:col-span-2">
                  <div>
                    <div className="text-sm font-medium">{f.label}</div>
                    {f.hint && <div className="text-xs text-ink-mute">{f.hint}</div>}
                  </div>
                  <Toggle checked={Boolean(v)} onChange={(x) => set(f.key, x)} label={f.label} />
                </div>
              );
            }
            return (
              <Field key={f.key} label={f.label} hint={f.hint} className={wide ? "sm:col-span-2" : undefined}>
                {f.type === "select" ? (
                  <Select value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} options={f.options} />
                ) : f.type === "money" ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">$</span>
                    <Input type="number" inputMode="decimal" step="0.01" min={f.min ?? 0} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} className="pl-6 num" />
                  </div>
                ) : f.type === "percent" ? (
                  <div className="relative">
                    <Input type="number" inputMode="decimal" step={f.step ?? 0.01} min={f.min ?? 0} max={f.max} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} className="pr-7 num" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">%</span>
                  </div>
                ) : f.type === "number" ? (
                  <Input type="number" inputMode="numeric" step={f.step ?? 1} min={f.min} max={f.max} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} className="num" />
                ) : f.type === "date" ? (
                  <Input type="date" value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <Input type="text" value={String(v ?? "")} placeholder={"placeholder" in f ? f.placeholder : undefined}onChange={(e) => set(f.key, e.target.value)} autoFocus={f === fields[0]} />
                )}
              </Field>
            );
          })}
        </div>
        {err && <Alert>{err}</Alert>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {onDelete ? (
            <Button type="button" variant={confirmDelete ? "danger" : "ghost"} onClick={doDelete} disabled={busy}>
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={busy}>{submitLabel}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
