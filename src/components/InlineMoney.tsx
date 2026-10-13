import { useEffect, useState } from "react";
import { cx } from "./ui";

/** A money cell that saves when you leave it (or press Enter). */
export function InlineMoney({ value, onSave, label, className }: { value: number; onSave: (v: number) => Promise<unknown> | void; label: string; className?: string }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(String(value ?? 0)); }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const num = Number(draft);
    if (!Number.isFinite(num) || num < 0) { setDraft(String(value)); return; }
    if (num !== Number(value)) void onSave(Math.round(num * 100) / 100);
  };

  return (
    <div className={cx("relative", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-mute">$</span>
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={focused ? draft : Number(value ?? 0).toFixed(0)}
        onFocus={(e) => { setFocused(true); setDraft(String(value ?? 0)); e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(String(value)); (e.target as HTMLInputElement).blur(); } }}
        className="num w-full rounded-md border border-transparent bg-transparent py-1.5 pl-5 pr-2 text-right text-sm hover:border-paper-line focus:border-vital-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vital-100"
      />
    </div>
  );
}
