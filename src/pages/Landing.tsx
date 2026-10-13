import { Link } from "react-router-dom";
import { ArrowRight, Calculator, Check, CreditCard, LineChart, Lock, PiggyBank, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  { icon: Calculator, title: "Every number, calculated", body: "Income, spending, bills, debt payments and savings roll up into one clear monthly picture — plus year-to-date totals." },
  { icon: LineChart, title: "Know your DTI", body: "Front-end and back-end debt-to-income, the same way lenders measure it. See exactly where you stand before you apply." },
  { icon: CreditCard, title: "A real debt payoff plan", body: "Avalanche or snowball, month by month, with total interest and your actual debt-free date. Add $50 extra and watch it move." },
  { icon: PiggyBank, title: "Savings that forecast", body: "Every goal shows what you need each month and when you'll get there. Emergency fund coverage counted in months." },
  { icon: Sparkles, title: "An advisor that reads your books", body: "Ask anything. The AI answers with your real figures — never generic budgeting tips." },
  { icon: Lock, title: "Private by design", body: "Your records are locked to your account at the database level. AI calls run on our server, never in your browser." },
];

export const PLANS = [
  { id: "free", name: "Free", price: 0, tagline: "Build your financial foundation.", features: ["Monthly budget, bills & transactions", "Debt payoff planner & DTI", "Savings goals & net worth"] },
  { id: "plus", name: "Plus", price: 10, tagline: "See the bigger picture.", features: ["Everything in Free", "Year-to-date analytics & trends", "Subscription radar & CSV export"] },
  { id: "premium", name: "Premium", price: 20, tagline: "Turn your numbers into a plan.", features: ["Everything in Plus", "AI advisor grounded in your records", "On-demand monthly reviews"], featured: true },
] as const;

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-3">
          <a href="#features" className="hidden rounded-lg px-3 py-2 text-ink-soft hover:text-ink sm:block">How it works</a>
          <a href="#plans" className="hidden rounded-lg px-3 py-2 text-ink-soft hover:text-ink sm:block">Plans</a>
          {user ? (
            <Link to="/dashboard" className="rounded-lg bg-ink px-4 py-2 font-semibold text-white">Open dashboard</Link>
          ) : (
            <>
              <Link to="/signin" className="rounded-lg px-3 py-2 text-ink-soft hover:text-ink">Sign in</Link>
              <Link to="/signup" className="rounded-lg bg-ink px-4 py-2 font-semibold text-white">Start free</Link>
            </>
          )}
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pt-16">
          <div>
            <p className="eyebrow text-vital-600">Your personal finance command center</p>
            <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1.02] sm:text-6xl">
              Check your money's <span className="italic text-vital-600">vital signs.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-soft">
              See where every dollar goes, what you can actually afford, and the fastest way out of debt — calculated from your real numbers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={user ? "/dashboard" : "/signup"} className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[15px] font-semibold text-white hover:bg-ink-soft">
                {user ? "Open your dashboard" : "Create a free account"} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#plans" className="rounded-lg border border-paper-line bg-white px-5 py-3 text-[15px] font-semibold">See plans</a>
            </div>
            <p className="mt-4 text-sm text-ink-mute">Free forever plan. 7-day Premium trial with the AI advisor — no card required.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-vital-50 grid-paper" />
            <div className="rounded-2xl border border-paper-line bg-white p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="eyebrow">October · sample</span>
                <span className="rounded-full bg-vital-50 px-2 py-0.5 text-[11px] font-semibold text-vital-700">Health 78 · Strong</span>
              </div>
              <div className="mt-5 eyebrow">Left after bills, debt & savings</div>
              <div className="num mt-1 font-display text-5xl font-semibold">$1,915</div>
              <svg viewBox="0 0 320 70" className="mt-4 w-full" aria-hidden>
                <path d="M0 50 C40 46 60 30 100 34 S170 52 210 28 S280 12 320 16" fill="none" stroke="#1F8A55" strokeWidth="3" strokeLinecap="round" />
                <path d="M0 50 C40 46 60 30 100 34 S170 52 210 28 S280 12 320 16 V70 H0Z" fill="#1F8A55" opacity=".08" />
              </svg>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-paper-line pt-4">
                {[["Income", "$9,850"], ["Committed", "$6,435"], ["Saved", "$1,500"]].map(([k, v]) => (
                  <div key={k}><div className="text-xs text-ink-mute">{k}</div><div className="num mt-0.5 font-semibold">{v}</div></div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-ink px-4 py-3 text-sm text-white">
                <span className="text-vital-400">Advisor:</span> Put the extra $300 on the 24.9% card first — you'll be debt-free 7 months sooner and save $1,840 in interest.
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-paper-line bg-white py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="eyebrow">Built for the decisions that matter</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl font-semibold">More than a monthly budget.</h2>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <f.icon className="h-6 w-6 text-vital-600" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="eyebrow">Simple plans</p>
            <h2 className="mt-3 font-display text-4xl font-semibold">Start with clarity. Grow from there.</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PLANS.map((p) => (
                <div key={p.id} className={`flex flex-col rounded-2xl border p-7 ${"featured" in p && p.featured ? "border-ink bg-ink text-white" : "border-paper-line bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${"featured" in p && p.featured ? "text-white" : ""}`}>{p.name}</h3>
                    {"featured" in p && p.featured && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-ink">Most complete</span>}
                  </div>
                  <p className={`mt-1 text-sm ${"featured" in p && p.featured ? "text-white/60" : "text-ink-mute"}`}>{p.tagline}</p>
                  <div className="mt-6 flex items-baseline gap-1"><span className="num font-display text-5xl font-semibold">${p.price}</span><span className="text-sm opacity-60">/month</span></div>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${"featured" in p && p.featured ? "text-vital-400" : "text-vital-600"}`} />{f}</li>
                    ))}
                  </ul>
                  <Link to={user ? (p.id === "free" ? "/dashboard" : "/billing") : "/signup"}
                    className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${"featured" in p && p.featured ? "bg-white text-ink" : "bg-ink text-white"}`}>
                    {p.id === "free" ? "Create a free account" : `Get ${p.name}`}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-ink-mute">Paid plans bill monthly in USD through Stripe. Cancel anytime from Plans & billing.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-paper-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-ink-mute sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-xs leading-relaxed">Money Vitals provides budgeting tools, calculations and general educational information. It is not individualized investment, tax, legal or lending advice. Verify projections before making major financial decisions.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            <Link to="/terms" className="hover:text-ink">Terms</Link>
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/refunds" className="hover:text-ink">Refunds</Link>
            <Link to="/signin" className="hover:text-ink">Sign in</Link>
          </nav>
        </div>
        <div className="border-t border-paper-line py-4 text-center text-xs text-ink-mute">© {new Date().getFullYear()} Michael Furnace LLC. All rights reserved.</div>
      </footer>
    </div>
  );
}
