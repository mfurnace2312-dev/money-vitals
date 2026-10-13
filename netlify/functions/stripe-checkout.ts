import Stripe from "stripe";
import { adminClient, ConfigError, env, handleError, json, requireUser, siteUrl } from "../lib/server";
import { customerFor, priceFor, stripeEnv } from "../lib/stripe";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  try {
    const user = await requireUser(req);
    if (user instanceof Response) return user;

    const body = (await req.json().catch(() => null)) as { tier?: string } | null;
    const tier = body?.tier;
    if (tier !== "plus" && tier !== "premium") return json(400, { error: "Pick Plus or Premium." });

    const key = env("STRIPE_SECRET_KEY");
    const price = priceFor(tier);
    if (!price) return handleError(new ConfigError(`Stripe price for ${tier} is missing (STRIPE_${tier.toUpperCase()}_PRICE_ID).`));
    const environment = stripeEnv(key);
    const stripe = new Stripe(key);
    const db = adminClient();

    // Already subscribed? Send them to the billing portal instead of a second subscription.
    const { data: subs } = await db.from("stripe_subscriptions").select("status").eq("user_id", user.id).eq("environment", environment);
    if ((subs ?? []).some((s) => ["active", "trialing", "past_due"].includes(s.status))) {
      return json(409, { error: "You already have a subscription. Use “Manage billing” to change plans." });
    }

    const { data: reservation, error: resErr } = await db.rpc("reserve_stripe_checkout", { p_user_id: user.id, p_environment: environment, p_tier: tier });
    if (resErr) return json(409, { error: resErr.message });

    const customer = await customerFor(stripe, user.id, user.email, environment);
    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        line_items: [{ price, quantity: 1 }],
        allow_promotion_codes: true,
        automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
        client_reference_id: user.id,
        subscription_data: { metadata: { user_id: user.id, tier } },
        metadata: { user_id: user.id, tier },
        success_url: `${base}/billing?checkout=success`,
        cancel_url: `${base}/billing?checkout=canceled`,
      },
      { idempotencyKey: `mv-checkout-${(reservation as { request_id: string }).request_id}` },
    );
    await db.from("stripe_checkout_reservations").update({ session_id: session.id }).eq("user_id", user.id).eq("environment", environment);
    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: "/api/checkout" };
