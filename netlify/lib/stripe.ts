import type Stripe from "stripe";
import { adminClient } from "./server";

export const stripeEnv = (key: string) => (key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : "test");

/** Find or create this user's Stripe customer and remember the mapping. */
export async function customerFor(stripe: Stripe, userId: string, email: string | undefined, environment: string) {
  const db = adminClient();
  const lookup = () => db.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).eq("environment", environment).maybeSingle();
  const { data: existing } = await lookup();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;
  const customer = await stripe.customers.create({ email, metadata: { user_id: userId } }, { idempotencyKey: `mv-customer-${userId}-${environment}` });
  const { error } = await db.from("stripe_customers").insert({ user_id: userId, environment, stripe_customer_id: customer.id });
  if (error) {
    const { data: again } = await lookup(); // a parallel request may have created it first
    if (again?.stripe_customer_id) return again.stripe_customer_id as string;
    throw error;
  }
  return customer.id;
}

/** Monthly price ID for a plan. Accepts either naming style for the Netlify setting. */
export function priceFor(tier: "plus" | "premium") {
  return tier === "plus"
    ? process.env.STRIPE_PLUS_PRICE_ID || process.env.STRIPE_PRICE_PLUS || ""
    : process.env.STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM || "";
}
