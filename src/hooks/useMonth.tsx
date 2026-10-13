import { createContext, useContext, useState, type ReactNode } from "react";
import { thisMonth, shiftMonth, monthKey, monthLabel } from "@/lib/finance";

type MonthCtx = { year: number; month1: number; key: string; label: string; prev: () => void; next: () => void; reset: () => void; isCurrent: boolean };
const Ctx = createContext<MonthCtx | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [ym, setYm] = useState(thisMonth());
  const now = thisMonth();
  const value: MonthCtx = {
    ...ym,
    key: monthKey(ym.year, ym.month1),
    label: monthLabel(ym.year, ym.month1),
    prev: () => setYm((s) => shiftMonth(s.year, s.month1, -1)),
    next: () => setYm((s) => shiftMonth(s.year, s.month1, 1)),
    reset: () => setYm(thisMonth()),
    isCurrent: ym.year === now.year && ym.month1 === now.month1,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMonth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMonth must be used inside <MonthProvider>");
  return c;
}
