import { clsx } from "clsx";
import { Loader2, X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export const cx = clsx;

export function Card({ className, children, pad = true }: { className?: string; children: ReactNode; pad?: boolean }) {
  return <div className={cx("rounded-3xl border border-paper-line bg-paper-card", pad && "p-5 sm:p-6", className)}>{children}</div>;
}

export function CardHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-xl">{title}</h3>
        {sub && <p className="mt-0.5 text-sm text-ink-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean };
export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" && "px-3.5 py-1.5 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-[15px]",
        variant === "primary" && "bg-pulse-500 text-white hover:bg-pulse-600",
        variant === "secondary" && "border-2 border-ink/10 bg-white text-ink hover:border-ink",
        variant === "ghost" && "text-ink-soft hover:bg-ink/5",
        variant === "danger" && "bg-alert-500 text-white hover:bg-alert-500/90",
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("input", props.className)} />;
}

export function Select({ options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) {
  return (
    <select {...props} className={cx("input appearance-none bg-[length:12px] bg-[right_.75rem_center] bg-no-repeat pr-8", props.className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7872' stroke-width='1.6' fill='none'/%3E%3C/svg%3E\")" }}>
      {options.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition", checked ? "bg-pulse-500" : "bg-ink/15")}>
      <span className={cx("inline-block h-4 w-4 rounded-full bg-white shadow transition", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "gold"; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
      tone === "neutral" && "bg-ink/[.06] text-ink-soft",
      tone === "good" && "bg-vital-50 text-vital-700",
      tone === "warn" && "bg-gold-400/30 text-ink",
      tone === "bad" && "bg-alert-50 text-alert-500",
      tone === "gold" && "bg-gold-400 text-ink")}>
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={cx("num mt-1.5 font-display text-3xl", tone === "good" && "text-vital-600", tone === "bad" && "text-alert-500")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-mute">{sub}</div>}
    </div>
  );
}

export function Progress({ value, tone = "good" }: { value: number; tone?: "good" | "warn" | "bad" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/[.07]" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all", tone === "good" && "bg-pulse-500", tone === "warn" && "bg-gold-400", tone === "bad" && "bg-alert-500")} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-pulse-100 bg-white px-6 py-14 text-center">
      {icon && <div className="mb-3 text-pulse-500">{icon}</div>}
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-mute">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "good" | "info"; children: ReactNode }) {
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cx("rounded-lg px-3.5 py-2.5 text-sm",
      tone === "bad" && "bg-alert-50 text-alert-500", tone === "good" && "bg-vital-50 text-vital-700", tone === "info" && "bg-ink/5 text-ink-soft")}>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-mute hover:bg-ink/5" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[15px] text-ink-mute">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
