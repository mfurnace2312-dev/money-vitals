import { Logo } from "@/components/brand";

const UPDATED = "October 2026";

const DOCS: Record<string, { title: string; sections: [string, string][] }> = {
  terms: {
    title: "Terms & Conditions",
    sections: [
      ["Who we are", "Money Vitals is operated by Michael Furnace LLC. By creating an account you agree to these terms."],
      ["What the service is", "Money Vitals provides budgeting tools, calculations, projections and general educational information. It is not a bank, lender, broker or registered advisor, and nothing in the service is individualized investment, tax, legal or lending advice."],
      ["Your account", "You're responsible for the accuracy of the information you enter and for keeping your password private. You must be at least 18 to use Money Vitals."],
      ["AI features", "AI answers are generated from the figures stored in your account. They can be wrong. Double-check anything important before acting on it."],
      ["Paid plans", "Plus and Premium are billed monthly through Stripe until you cancel. You can cancel anytime from Plans & billing; access continues to the end of the paid period."],
      ["Acceptable use", "Don't misuse the service, attempt to access other people's data, or interfere with its operation. We may suspend accounts that do."],
      ["Liability", "The service is provided as-is. To the extent the law allows, Michael Furnace LLC isn't liable for financial decisions made using the service."],
      ["Changes", "We may update these terms; if a change is significant we'll let you know in the app or by email."],
    ],
  },
  privacy: {
    title: "Privacy Notice",
    sections: [
      ["What we collect", "Your email address, the financial figures you enter (income, bills, debts, goals and similar), and basic usage logs needed to run the service."],
      ["How it's protected", "Your records are stored in a database that enforces row-level security, so each account can only ever read its own data. Connections are encrypted."],
      ["AI processing", "When you use the AI advisor, a summary of your figures is sent from our server to our AI provider to generate an answer. It isn't used to train their models and isn't sold."],
      ["Payments", "Payments are handled by Stripe. We never see or store your full card number."],
      ["What we never do", "We don't sell your personal or financial information."],
      ["Your choices", "You can edit or delete your records at any time, and you can ask us to delete your account by contacting support."],
    ],
  },
  refunds: {
    title: "Refund Policy",
    sections: [
      ["Trials", "The 7-day Premium trial is free. You won't be charged unless you choose a paid plan."],
      ["Monthly plans", "Subscriptions renew monthly. Cancel anytime and you won't be billed again; you keep access until the end of the period you've paid for."],
      ["Refunds", "If you were charged in error or something didn't work, contact us within 14 days of the charge and we'll make it right."],
    ],
  },
};

export default function Legal({ doc }: { doc: "terms" | "privacy" | "refunds" }) {
  const d = DOCS[doc];
  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-3xl px-5 py-6"><Logo /></header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="font-display text-4xl font-semibold">{d.title}</h1>
        <p className="mt-2 text-sm text-ink-mute">Last updated {UPDATED}</p>
        <div className="mt-10 space-y-8">
          {d.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="text-lg font-semibold">{h}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
