# Money Vitals

Personal finance command center: monthly budget, bills, debt payoff planner with DTI, savings goals, net worth, subscriptions, transactions, and an AI advisor grounded in the user's own numbers.

**Live:** https://smart-money-ai-aah4.netlify.app

## Stack

| Piece | What it does |
|---|---|
| React + Vite + Tailwind (`src/`) | The website people use |
| Supabase (`kkcxsebkvkvlkwbcfdkt`) | Logins and the database. Every table has row-level security so each account only sees its own rows |
| Netlify functions (`netlify/functions/`) | Server code: AI advisor, Stripe checkout, Stripe billing portal, Stripe webhook |
| Stripe | Plus ($10/mo) and Premium ($20/mo) subscriptions |
| Anthropic | The AI advisor |

Every push to `main` on GitHub deploys automatically to Netlify.

## Plans

- **Free** — budget, bills, debts & DTI, savings, net worth, subscriptions list, transactions
- **Plus** — adds year-to-date analytics, subscription radar, CSV import/export
- **Premium** — adds the AI advisor. New users can start a one-time 7-day Premium trial with no card.

## Environment variables (Netlify → Site configuration → Environment variables)

| Name | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | `https://kkcxsebkvkvlkwbcfdkt.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → secret / service_role key. **Server only.** |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_PLUS_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID` | Stripe → Product catalog → each plan's monthly price ID (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint `https://<site>/api/public/payments/webhook` → signing secret |

Webhook events to send: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

## Supabase auth settings

Authentication → URL Configuration:
- **Site URL:** the live site address
- **Redirect URLs:** `https://<site>/**`

Google sign-in appears automatically on the sign-in page once Google is enabled under Authentication → Sign In / Providers.

## Local development

```bash
cp .env.example .env   # fill in the two VITE_ values
npm install
npm run dev
```
