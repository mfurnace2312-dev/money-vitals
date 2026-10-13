import { Link } from "react-router-dom";
import { cx } from "./ui";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cx("h-8 w-8", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0E1A16" />
      <path d="M10 36h10l5-12 8 22 6-16 4 6h11" fill="none" stroke="#3BAA6E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ to = "/", light }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Money Vitals home">
      <Mark />
      <span className={cx("text-[15px] font-bold tracking-tight", light ? "text-white" : "text-ink")}>
        Money<span className="text-vital-500">Vitals</span>
      </span>
    </Link>
  );
}
