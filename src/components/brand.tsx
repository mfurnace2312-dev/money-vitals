import { Link } from "react-router-dom";
import { cx } from "./ui";

export function Mark({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cx("h-9 w-9", className)} aria-hidden>
      <rect width="64" height="64" rx="18" fill={inverse ? "#FFFFFF" : "#3D2BFF"} />
      <path d="M8 36h11l5-13 8 24 6-17 4 6h14" fill="none" stroke={inverse ? "#3D2BFF" : "#FFD23F"} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ to = "/", light }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Money Vitals home">
      <Mark inverse={light} />
      <span className={cx("font-display text-[21px] leading-none", light ? "text-white" : "text-ink")}>Money Vitals</span>
    </Link>
  );
}

/** The heartbeat line. `draw` animates it in once on mount. */
export function Ecg({ className, draw, color = "currentColor", width = 3 }: { className?: string; draw?: boolean; color?: string; width?: number }) {
  const d = "M0 60 H180 L200 60 L214 22 L232 104 L250 8 L268 86 L280 60 H420 L436 60 L446 44 L458 76 L468 60 H640";
  return (
    <svg viewBox="0 0 640 112" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        className={draw ? "ecg animate-draw" : undefined} style={draw ? ({ "--len": 4000 } as React.CSSProperties) : undefined} />
    </svg>
  );
}
