import Stripe from "stripe";
import { adminClient, env, handleError, json, requireUser, siteUrl } from "../lib/server";
import { stripeEnv } from "../lib/stripe";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  try {
    const user = await requireUser(req);
    if (user instanceof Response) return user;
    const key = env("STRIPE_SECRET_KEY");
    const { data: c } = await adminClient().from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).eq("environment", stripeEnv(key)).maybeSingle();
    if (!c) return json(404, { error: "No billing account yet — pick a plan first." });
    const session = await new Stripe(key).billingPortal.sessions.create({ customer: c.stripe_customer_id, return_url: `${siteUrl(req)}/billing` });
    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: "/api/billing-portal" };
