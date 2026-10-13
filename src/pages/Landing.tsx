import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Ecg, Logo } from "@/components/brand";
import { useAuth } from "@/hooks/useAuth";
import { cx } from "@/components/ui";

export const PLANS = [
  { id: "free", name: "Free", price: 0, tagline: "Build your financial foundation.", features: ["Monthly budget, bills & transactions", "Debt payoff planner & DTI", "Savings goals & net worth"] },
  { id: "plus", name: "Plus", price: 10, tagline: "See the bigger picture.", features: ["Everything in Free", "Automatic bank syncing", "Year-to-date analytics & trends", "Subscription radar & CSV export"] },
  { id: "premium", name: "Premium", price: 20, tagline: "Turn your numbers into a plan.", features: ["Everything in Plus", "AI advisor that reads your real numbers", "On-demand monthly reviews"], featured: true },
] as const;

/** The five readings the app actually scores you on. */
const VITALS = [
  { name: "Cash flow", reading: "+$1,915", note: "What's left after bills, debt and savings — and what's safe to spend per day.", tone: "bg-vital-400" },
  { name: "Debt-to-income", reading: "24%", note: "Front-end and back-end, calculated from gross income the way lenders do it.", tone: "bg-gold-400" },
  { name: "Debt-free date", reading: "Mar 2028", note: "Avalanche or snowball, month by month. Slide in $50 extra and watch it move.", tone: "bg-pulse-300" },
  { name: "Savings rate", reading: "15.2%", note: "Every goal gets a monthly target and a projected finish date.", tone: "bg-alert-300" },
  { name: "Emergency fund", reading: "3.4 mo", note: "How many months of essentials you could cover tomorrow.", tone: "bg-white" },
];

function Monitor() {
  return (
    <div className="relative mx-auto -mt-2 w-full max-w-5xl px-5 sm:px-8">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/15 sm:grid-cols-4">
        {[
          ["Left to spend", "$1,915", "text-gold-400"],
          ["Back-end DTI", "24%", "text-white"],
          ["Debt-free", "Mar 2028", "text-white"],
          ["Health", "78", "text-vital-400"],
        ].map(([label, value, color], i) => (
          <div key={label} className="animate-rise bg-pulse-600 px-5 py-5 sm:px-6" style={{ animationDelay: `${1.5 + i * 0.12}s` }}>
            <div className="text-[13px] font-medium text-white/60">{label}</div>
            <div className={cx("num mt-1 font-display text-3xl sm:text-4xl", color)}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const primaryTo = user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>

      {/* Hero: one full-bleed ultramarine block with a live heartbeat */}
      <section className="relative overflow-hidden bg-pulse-500 pb-16 text-white sm:pb-24">
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo light />
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2" aria-label="Main">
            <a href="#vitals" className="hidden rounded-full px-3.5 py-2 text-white/80 hover:text-white sm:block">What it tracks</a>
            <a href="#plans" className="hidden rounded-full px-3.5 py-2 text-white/80 hover:text-white sm:block">Plans</a>
            {user ? (
              <Link to="/dashboard" className="rounded-full bg-white px-4 py-2 font-bold text-pulse-600">Open dashboard</Link>
            ) : (
              <>
                <Link to="/signin" className="rounded-full px-3.5 py-2 text-white/80 hover:text-white">Sign in</Link>
                <Link to="/signup" className="rounded-full bg-white px-4 py-2 font-bold text-pulse-600">Start free</Link>
              </>
            )}
          </nav>
        </header>

        <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 pt-10 sm:px-8 sm:pt-16">
          <h1 className="max-w-4xl font-display text-[64px] text-white sm:text-[104px] lg:text-[128px]">
            Your money has a pulse.
          </h1>
          <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md text-lg leading-relaxed text-white/80">
              Money Vitals reads your income, bills, debt and savings, then tells you what's healthy, what's not, and the next move to make.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={primaryTo} className="rounded-full bg-gold-400 px-6 py-3.5 text-[15px] font-bold text-ink transition hover:bg-gold-300">
                {user ? "Open your dashboard" : "Take your pulse — free"}
              </Link>
              <a href="#plans" className="rounded-full border-2 border-white/30 px-6 py-3 text-[15px] font-bold text-white hover:border-white">See plans</a>
            </div>
          </div>
        </main>

        <div className="relative z-0 mt-10 h-28 sm:mt-14 sm:h-36" aria-hidden>
          <Ecg draw className="h-full w-full text-white" width={3.5} />
        </div>
        <Monitor />
        <p className="mx-auto mt-4 max-w-5xl px-5 text-xs text-white/50 sm:px-8">Sample readings. Your dashboard calculates from the numbers you enter or sync.</p>
      </section>

      {/* The five vitals */}
      <section id="vitals" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="max-w-2xl font-display text-5xl sm:text-6xl">Five readings. One honest picture.</h2>
        <p className="mt-5 max-w-xl text-lg text-ink-soft">These are the numbers your health score is built from. Every one is calculated, never guessed — the AI only explains them.</p>
        <ul className="mt-14 divide-y-2 divide-ink/[.07] border-y-2 border-ink/[.07]">
          {VITALS.map((v) => (
            <li key={v.name} className="grid items-center gap-3 py-7 sm:grid-cols-[1.1fr_1fr_1.4fr] sm:gap-8">
              <div className="flex items-center gap-4">
                <span className={cx("h-4 w-4 shrink-0 rounded-full ring-2 ring-ink", v.tone)} aria-hidden />
                <span className="font-display text-3xl sm:text-4xl">{v.name}</span>
              </div>
              <span className="num font-display text-4xl text-pulse-500 sm:text-5xl">{v.reading}</span>
              <p className="text-[15px] leading-relaxed text-ink-soft">{v.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Advisor: sunshine block */}
      <section className="bg-gold-400">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-display text-5xl sm:text-6xl">Ask it anything. It already knows your numbers.</h2>
            <p className="mt-5 max-w-md text-lg text-ink/80">The Premium advisor reads your actual budget, debts and goals before it answers — so you get your plan, not a generic tip.</p>
            <Link to={primaryTo} className="mt-8 inline-flex rounded-full bg-ink px-6 py-3.5 text-[15px] font-bold text-white hover:bg-ink-soft">Try it free for 7 days</Link>
          </div>
          <div className="space-y-3" role="img" aria-label="Example conversation with the advisor">
            <div className="ml-auto max-w-sm rounded-3xl rounded-br-lg bg-ink px-5 py-4 text-[15px] text-white">I have an extra $300 a month. Where should it go?</div>
            <div className="max-w-md rounded-3xl rounded-bl-lg bg-white px-5 py-4 text-[15px] leading-relaxed text-ink">
              Put it on your <strong>Capital One card at 24.9%</strong> first. With $300 extra, you're debt-free in <strong>March 2028 instead of October 2028</strong> and save about <strong>$1,840</strong> in interest. Once it's paid off, roll that payment into the car loan.
            </div>
            <div className="ml-auto max-w-xs rounded-3xl rounded-br-lg bg-ink px-5 py-4 text-[15px] text-white">And my emergency fund?</div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="font-display text-5xl sm:text-6xl">Start free. Upgrade when it pays for itself.</h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => {
            const featured = "featured" in p && p.featured;
            return (
              <div key={p.id} className={cx("flex flex-col rounded-3xl p-8", featured ? "bg-pulse-500 text-white" : "border-2 border-ink/[.08] bg-white")}>
                <div className="flex items-center justify-between">
                  <h3 className={cx("font-display text-3xl", featured && "text-white")}>{p.name}</h3>
                  {featured && <span className="rounded-full bg-gold-400 px-2.5 py-1 text-xs font-bold text-ink">Most complete</span>}
                </div>
                <p className={cx("mt-1", featured ? "text-white/70" : "text-ink-mute")}>{p.tagline}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="num font-display text-6xl">${p.price}</span>
                  <span className={cx("text-sm", featured ? "text-white/70" : "text-ink-mute")}>/month</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-[15px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5"><Check className={cx("mt-0.5 h-4 w-4 shrink-0", featured ? "text-gold-400" : "text-pulse-500")} strokeWidth={3} />{f}</li>
                  ))}
                </ul>
                <Link to={user ? (p.id === "free" ? "/dashboard" : "/billing") : "/signup"}
                  className={cx("mt-8 rounded-full px-5 py-3 text-center text-[15px] font-bold", featured ? "bg-gold-400 text-ink hover:bg-gold-300" : "bg-ink text-white hover:bg-ink-soft")}>
                  {p.id === "free" ? "Create a free account" : `Get ${p.name}`}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-ink-mute">Paid plans bill monthly in USD through Stripe. Cancel anytime from Plans & billing.</p>
      </section>

      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Logo light />
            <p className="mt-5 text-xs leading-relaxed text-white/55">Money Vitals provides budgeting tools, calculations and general educational information. It is not individualized investment, tax, legal or lending advice. Verify projections before making major financial decisions.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/70" aria-label="Footer">
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/refunds" className="hover:text-white">Refunds</Link>
            <Link to="/signin" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/45">© {new Date().getFullYear()} Michael Furnace LLC</div>
      </footer>
    </div>
  );
}
