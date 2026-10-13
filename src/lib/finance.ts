/**
 * Money Vitals calculation engine.
 * Every number on screen comes from these pure functions. The AI advisor is
 * given these results and explains them — it never invents figures.
 */

export type Kind = "income" | "expense";

export type BudgetEntry = { id: string; month: string; kind: Kind; category: string; planned: number; actual: number };
export type Bill = {
  id: string; month: string; name: string; category: string; amount: number; due_day: number;
  autopay: boolean; paid: boolean; frequency: string; account: string | null; is_housing: boolean; essential: boolean;
};
export type Debt = {
  id: string; name: string; kind: string; balance: number; original_balance: number; apr: number;
  min_payment: number; actual_payment: number; due_day: number; is_housing: boolean;
};
export type SavingsGoal = {
  id: string; name: string; category: string; target_amount: number; saved_amount: number;
  monthly_contribution: number; target_date: string | null;
};
export type Asset = { id: string; name: string; category: string; value: number };
export type Liability = { id: string; name: string; category: string; amount: number };
export type Transaction = {
  id: string; date: string; description: string; merchant: string | null; category: string; amount: number;
  account: string | null; type: string; recurring: boolean; notes: string | null;
};
export type Subscription = { id: string; name: string; price: number; frequency: string; next_payment: string | null; category: string };
export type Benchmark = { id: string; category: string; low_amount: number; high_amount: number; region: string; source: string; as_of: string };
export type Profile = {
  id: string; display_name: string | null; currency: string; pay_schedule: string; dti_front_max: number; dti_back_max: number;
  onboarding_completed: boolean; demo_seeded: boolean; trial_started_at: string | null; trial_ends_at: string | null;
};

export type FinanceData = {
  profile: Profile | null; entries: BudgetEntry[]; bills: Bill[]; debts: Debt[]; goals: SavingsGoal[];
  assets: Asset[]; liabilities: Liability[]; transactions: Transaction[]; subscriptions: Subscription[]; benchmarks: Benchmark[];
};

export const EMPTY_DATA: FinanceData = {
  profile: null, entries: [], bills: [], debts: [], goals: [], assets: [], liabilities: [], transactions: [], subscriptions: [], benchmarks: [],
};

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const INCOME_CATEGORIES = ["Salary","Self Employment","Business Income","Gig Income","Investment Income","Interest","Bonus","Rental Income","Other Income"];
export const EXPENSE_CATEGORIES = [
  "Groceries","Dining Out","Household","Transportation","Fuel","Childcare","Education","Medical","Insurance",
  "Clothing","Personal Care","Entertainment","Travel","Gifts","Subscriptions","Miscellaneous",
];
export const ESSENTIAL = new Set(["Groceries","Household","Transportation","Fuel","Childcare","Medical","Insurance"]);
export const BILL_CATEGORIES = ["Housing","Utilities","Phone & Internet","Insurance","Transportation","Childcare","Other"];
export const DEBT_KINDS = ["Credit Card","Auto Loan","Student Loan","Personal Loan","Medical","Mortgage","Other"];
export const GOAL_CATEGORIES = ["Emergency Fund","Savings","Home","Car","Travel","Education","Retirement","Other"];
export const ASSET_CATEGORIES = ["Cash","Checking","Savings","Retirement","Brokerage","Real Estate","Vehicle","Other"];
export const SUB_CATEGORIES = ["Streaming","Music","Software","News","Fitness","Shopping","Gaming","Other"];

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (vals: number[]) => vals.reduce((a, b) => a + b, 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

export const monthKey = (y: number, m1: number) => `${y}-${String(m1).padStart(2, "0")}-01`;
export const thisMonth = () => { const d = new Date(); return { year: d.getFullYear(), month1: d.getMonth() + 1 }; };
export const monthLabel = (y: number, m1: number) => `${MONTHS[m1 - 1]} ${y}`;
export function shiftMonth(y: number, m1: number, delta: number) {
  const d = new Date(y, m1 - 1 + delta, 1);
  return { year: d.getFullYear(), month1: d.getMonth() + 1 };
}

export function money(v: number, digits = 0, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n(v));
}
export const pct = (v: number, d = 1) => `${n(v).toFixed(d)}%`;

/* ------------------------------ Month ------------------------------ */

export type MonthSummary = {
  key: string; year: number; month1: number; label: string;
  income: number; incomePlanned: number; expenses: number; expensesPlanned: number;
  bills: number; billsPaid: number; housing: number; debtPayments: number; savings: number;
  committed: number; moneyLeft: number; cashFlow: number; savingsRate: number; essentials: number;
  byCategory: Record<string, { planned: number; actual: number }>;
};

export function summarizeMonth(d: FinanceData, year: number, month1: number): MonthSummary {
  const key = monthKey(year, month1);
  const entries = d.entries.filter((e) => e.month === key);
  const bills = d.bills.filter((b) => b.month === key);
  const inc = entries.filter((e) => e.kind === "income");
  const exp = entries.filter((e) => e.kind === "expense");

  const income = sum(inc.map((e) => n(e.actual)));
  const expenses = sum(exp.map((e) => n(e.actual)));
  const billsTotal = sum(bills.map((b) => n(b.amount)));
  const housing = sum(bills.filter((b) => b.is_housing).map((b) => n(b.amount)));
  // Mortgage is tracked as a housing bill, so housing debts are excluded here to avoid double counting.
  const debtPayments = sum(d.debts.filter((x) => !x.is_housing).map((x) => n(x.actual_payment) || n(x.min_payment)));
  const savings = sum(d.goals.map((g) => n(g.monthly_contribution)));
  const committed = expenses + billsTotal + debtPayments;

  const byCategory: MonthSummary["byCategory"] = {};
  for (const e of exp) {
    const c = byCategory[e.category] ?? { planned: 0, actual: 0 };
    byCategory[e.category] = { planned: c.planned + n(e.planned), actual: c.actual + n(e.actual) };
  }

  return {
    key, year, month1, label: monthLabel(year, month1),
    income, incomePlanned: sum(inc.map((e) => n(e.planned))),
    expenses, expensesPlanned: sum(exp.map((e) => n(e.planned))),
    bills: billsTotal, billsPaid: sum(bills.filter((b) => b.paid).map((b) => n(b.amount))),
    housing, debtPayments, savings, committed,
    moneyLeft: income - committed - savings,
    cashFlow: income - committed,
    savingsRate: income > 0 ? (savings / income) * 100 : 0,
    essentials: sum(bills.filter((b) => b.essential).map((b) => n(b.amount))) + sum(exp.filter((e) => ESSENTIAL.has(e.category)).map((e) => n(e.actual))),
    byCategory,
  };
}

/** Last `count` months ending at (year, month1), oldest first. */
export function recentMonths(d: FinanceData, year: number, month1: number, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const s = shiftMonth(year, month1, i - (count - 1));
    return summarizeMonth(d, s.year, s.month1);
  });
}

export function yearToDate(d: FinanceData, year: number) {
  const now = thisMonth();
  const upTo = year === now.year ? now.month1 : 12;
  const months = Array.from({ length: upTo }, (_, i) => summarizeMonth(d, year, i + 1));
  return {
    months,
    income: sum(months.map((m) => m.income)),
    committed: sum(months.map((m) => m.committed)),
    savings: sum(months.map((m) => m.savings)),
    cashFlow: sum(months.map((m) => m.cashFlow)),
  };
}

/* ------------------------------- DTI ------------------------------- */

export type Dti = { gross: number; housing: number; otherDebt: number; front: number; back: number };

export function calcDti(gross: number, housing: number, otherDebt: number): Dti {
  return {
    gross, housing, otherDebt,
    front: gross > 0 ? (housing / gross) * 100 : 0,
    back: gross > 0 ? ((housing + otherDebt) / gross) * 100 : 0,
  };
}
export function dtiFor(d: FinanceData, m: MonthSummary) {
  return calcDti(m.income, m.housing, sum(d.debts.filter((x) => !x.is_housing).map((x) => n(x.min_payment))));
}
export function dtiBand(v: number) {
  if (v < 20) return { label: "Excellent", tone: "good" as const };
  if (v < 30) return { label: "Healthy", tone: "good" as const };
  if (v < 36) return { label: "Moderate", tone: "warn" as const };
  if (v < 43) return { label: "High", tone: "bad" as const };
  return { label: "Very high", tone: "bad" as const };
}

/* ---------------------------- Debt payoff --------------------------- */

export type Strategy = "avalanche" | "snowball";
export type Payoff = {
  months: number; freeDate: string; interest: number; capped: boolean;
  order: { id: string; name: string; month: number; interest: number }[];
  timeline: { label: string; balance: number }[];
};

export function simulatePayoff(debts: Debt[], extra: number, strategy: Strategy, includeHousing = false): Payoff {
  const list = debts
    .filter((x) => (includeHousing || !x.is_housing) && n(x.balance) > 0)
    .map((x) => ({ id: x.id, name: x.name, bal: n(x.balance), apr: n(x.apr), min: n(x.min_payment), int: 0, done: 0 }))
    .sort((a, b) => (strategy === "avalanche" ? b.apr - a.apr || a.bal - b.bal : a.bal - b.bal || b.apr - a.apr));

  const start = new Date();
  const timeline: Payoff["timeline"] = [];
  let month = 0;
  let interest = 0;
  const LIMIT = 600;

  while (list.some((x) => x.bal > 0.01) && month < LIMIT) {
    month++;
    let pool = Math.max(0, extra);
    for (const x of list) {
      if (x.bal <= 0.01) { pool += x.min; continue; } // freed-up minimums roll forward
      const i = (x.bal * x.apr) / 100 / 12;
      x.bal += i; x.int += i; interest += i;
      const pay = Math.min(x.min, x.bal);
      x.bal = r2(x.bal - pay);
      pool += x.min - pay;
    }
    for (const x of list) {
      if (pool <= 0) break;
      if (x.bal <= 0.01) continue;
      const pay = Math.min(pool, x.bal);
      x.bal = r2(x.bal - pay); pool -= pay;
    }
    for (const x of list) if (x.bal <= 0.01 && !x.done) x.done = month;
    const dt = new Date(start.getFullYear(), start.getMonth() + month, 1);
    timeline.push({ label: `${MONTHS[dt.getMonth()].slice(0, 3)} '${String(dt.getFullYear()).slice(2)}`, balance: r2(sum(list.map((x) => Math.max(0, x.bal)))) });
  }
  const end = new Date(start.getFullYear(), start.getMonth() + month, 1);
  return {
    months: month,
    freeDate: month === 0 ? "Debt free" : `${MONTHS[end.getMonth()]} ${end.getFullYear()}`,
    interest: r2(interest),
    capped: month >= LIMIT,
    order: [...list].sort((a, b) => (a.done || LIMIT) - (b.done || LIMIT)).map((x) => ({ id: x.id, name: x.name, month: x.done || month, interest: r2(x.int) })),
    timeline,
  };
}

/* ------------------------- Net worth & savings ------------------------- */

export function netWorth(d: FinanceData) {
  const assets = sum(d.assets.map((a) => n(a.value)));
  const debts = sum(d.debts.map((x) => n(x.balance)));
  const other = sum(d.liabilities.map((l) => n(l.amount)));
  return { assets, debts, other, liabilities: debts + other, net: assets - debts - other };
}

export function emergencyFund(essentialMonthly: number, saved: number) {
  return { essentialMonthly, saved, three: essentialMonthly * 3, six: essentialMonthly * 6, covered: essentialMonthly > 0 ? saved / essentialMonthly : 0 };
}

export function goalNeeded(g: SavingsGoal) {
  const left = Math.max(0, n(g.target_amount) - n(g.saved_amount));
  if (!g.target_date) return null;
  const t = new Date(g.target_date + "T00:00:00");
  const now = new Date();
  const months = Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
  return left / months;
}

export function goalEta(g: SavingsGoal) {
  const left = n(g.target_amount) - n(g.saved_amount);
  if (left <= 0) return "Reached";
  const c = n(g.monthly_contribution);
  if (c <= 0) return "Add a monthly amount";
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(left / c));
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function subscriptionTotals(subs: Subscription[]) {
  const monthly = sum(subs.map((s) => (s.frequency === "yearly" ? n(s.price) / 12 : s.frequency === "weekly" ? (n(s.price) * 52) / 12 : n(s.price))));
  return { monthly, yearly: monthly * 12 };
}

export function safeToSpend(m: MonthSummary) {
  const now = new Date();
  const days = new Date(m.year, m.month1, 0).getDate();
  const current = m.year === now.getFullYear() && m.month1 === now.getMonth() + 1;
  const left = current ? Math.max(days - now.getDate() + 1, 1) : days;
  const pool = Math.max(m.moneyLeft, 0);
  return { daysLeft: left, perDay: pool / left, perWeek: (pool / left) * 7 };
}

/* ------------------------------ Health ------------------------------ */

export function healthScore(m: MonthSummary, dti: Dti, efMonths: number) {
  const c = (x: number) => Math.max(0, Math.min(100, x));
  const parts = [
    { label: "Cash flow", w: 0.25, s: c(m.income > 0 ? (m.cashFlow / m.income) * 400 : 0) },
    { label: "Savings rate", w: 0.2, s: c((m.savingsRate / 20) * 100) },
    { label: "Debt-to-income", w: 0.25, s: c(((43 - dti.back) / 43) * 100) },
    { label: "Budget discipline", w: 0.1, s: m.expensesPlanned > 0 ? c(100 - Math.abs(1 - m.expenses / m.expensesPlanned) * 200) : 50 },
    { label: "Emergency fund", w: 0.2, s: c((efMonths / 6) * 100) },
  ];
  const score = Math.round(sum(parts.map((p) => p.s * p.w)));
  const band = score >= 85 ? "Excellent" : score >= 70 ? "Strong" : score >= 55 ? "Steady" : score >= 40 ? "Fragile" : "Needs attention";
  return { score, band, parts };
}

/* -------------------------- AI context packet ------------------------ */

/** Compact, numbers-only snapshot handed to the AI advisor. */
export function advisorSnapshot(d: FinanceData) {
  const { year, month1 } = thisMonth();
  const m = summarizeMonth(d, year, month1);
  const dti = dtiFor(d, m);
  const nw = netWorth(d);
  const ef = d.goals.find((g) => /emergency/i.test(g.name) || g.category === "Emergency Fund");
  return {
    month: m.label,
    income: r2(m.income), expenses: r2(m.expenses), bills: r2(m.bills), debtPayments: r2(m.debtPayments),
    savingsContributions: r2(m.savings), moneyLeft: r2(m.moneyLeft), savingsRatePct: r2(m.savingsRate),
    dti: { frontPct: r2(dti.front), backPct: r2(dti.back) },
    topSpending: Object.entries(m.byCategory).sort((a, b) => b[1].actual - a[1].actual).slice(0, 6)
      .map(([cat, v]) => ({ category: cat, actual: r2(v.actual), planned: r2(v.planned) })),
    debts: d.debts.map((x) => ({ name: x.name, kind: x.kind, balance: r2(n(x.balance)), aprPct: n(x.apr), minPayment: r2(n(x.min_payment)) })),
    goals: d.goals.map((g) => ({ name: g.name, target: n(g.target_amount), saved: n(g.saved_amount), monthly: n(g.monthly_contribution), targetDate: g.target_date })),
    netWorth: { assets: r2(nw.assets), liabilities: r2(nw.liabilities), net: r2(nw.net) },
    subscriptionsMonthly: r2(subscriptionTotals(d.subscriptions).monthly),
    emergencyFundSaved: ef ? n(ef.saved_amount) : 0,
    avalanche: (() => { const p = simulatePayoff(d.debts, 0, "avalanche"); return { months: p.months, debtFree: p.freeDate, totalInterest: p.interest }; })(),
  };
}
