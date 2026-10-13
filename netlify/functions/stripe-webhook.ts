import Stripe from "stripe";
import { adminClient, env, json } from "../lib/server";
import { priceFor, stripeEnv } from "../lib/stripe";

const toIso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    const key = env("STRIPE_SECRET_KEY");
    stripe = new Stripe(key);
    const raw = await req.text();
    event = await stripe.webhooks.constructEventAsync(raw, req.headers.get("stripe-signature") ?? "", env("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("Webhook signature check failed:", err);
    return json(400, { error: "Invalid signature" });
  }

  try {
    const environment = event.livemode ? "live" : stripeEnv(process.env.STRIPE_SECRET_KEY!);
    let sub: Stripe.Subscription | null = null;

    if (event.type.startsWith("customer.subscription.")) {
      sub = event.data.object as Stripe.Subscription;
    } else if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "subscription" && s.subscription) {
        sub = await stripe.subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
      }
      const uid = s.metadata?.user_id ?? s.client_reference_id;
      if (uid) await adminClient().from("stripe_checkout_reservations").delete().eq("user_id", uid).eq("environment", environment);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const subId = inv.parent?.subscription_details?.subscription ?? inv.subscription;
      if (subId) sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
    }

    if (!sub) return json(200, { received: true, ignored: event.type });

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    let userId = sub.metadata?.user_id;
    if (!userId) {
      const { data } = await adminClient().from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).eq("environment", environment).maybeSingle();
      userId = data?.user_id;
    }
    if (!userId) {
      console.warn(`No Money Vitals user for Stripe customer ${customerId}`);
      return json(200, { received: true, ignored: "unknown customer" });
    }

    const priceId = sub.items.data[0]?.price.id;
    const tier = priceId === priceFor("premium") ? "premium" : priceId === priceFor("plus") ? "plus" : (sub.metadata?.tier as string) || "plus";
    const item = sub.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number };
    const legacy = sub as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };

    const { error } = await adminClient().rpc("apply_stripe_event", {
      p_event_id: event.id,
      p_event_created: event.created,
      p_event_type: event.type,
      p_environment: environment,
      p_subscription: {
        stripe_subscription_id: sub.id,
        user_id: userId,
        stripe_customer_id: customerId,
        environment,
        tier,
        status: sub.status,
        current_period_start: toIso(item?.current_period_start ?? legacy.current_period_start),
        current_period_end: toIso(item?.current_period_end ?? legacy.current_period_end),
        trial_end: toIso(sub.trial_end),
        cancel_at_period_end: sub.cancel_at_period_end,
      },
    });
    if (error) {
      console.error("apply_stripe_event failed:", error);
      return json(500, { error: "Could not record the event" }); // Stripe will retry
    }
    return json(200, { received: true });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Webhook handler error" });
  }
};

// "/api/public/payments/webhook" is the address already registered in Stripe.
export const config = { path: ["/api/stripe-webhook", "/api/public/payments/webhook"] };
