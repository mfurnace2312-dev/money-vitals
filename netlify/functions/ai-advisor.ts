import Anthropic from "@anthropic-ai/sdk";
import { adminClient, env, handleError, json, planFor, requireUser } from "../lib/server";
import { advisorSnapshot, EMPTY_DATA, type FinanceData } from "../../src/lib/finance";

const TABLES = {
  entries: "budget_entries", bills: "bills", debts: "debts", goals: "savings_goals", assets: "assets",
  liabilities: "liabilities", transactions: "transactions", subscriptions: "subscriptions",
} as const;

const SYSTEM = `You are the Money Vitals advisor — a sharp, warm personal-finance coach.

Ground every answer in the user's figures in <snapshot>. Quote their actual numbers (dollars, percentages, dates).
Never invent figures that aren't in the snapshot. If something needed isn't there, say what to add and where in the app (Budget, Bills, Debt payoff, Savings goals, Net worth, Subscriptions).
Be concrete: give one clear recommendation first, then the reasoning, then at most 3 next steps.
Keep it under 220 words unless asked for more. Use short paragraphs or a short list. Plain language, no jargon without a quick explanation.
DTI in the snapshot is calculated from gross monthly income: front-end = housing only, back-end = housing + other debt minimums. Lenders generally prefer back-end under 36%.
You give general educational guidance, not individualized investment, tax or legal advice; for those, briefly suggest a licensed professional. Don't recommend specific securities.`;

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  try {
    const user = await requireUser(req);
    if (user instanceof Response) return user;

    const plan = await planFor(user.id);
    if (plan.tier !== "premium") return json(402, { error: "The AI advisor is part of Premium. Start a free trial or upgrade on Plans & billing." });

    const body = (await req.json().catch(() => null)) as { message?: string } | null;
    const message = String(body?.message ?? "").trim().slice(0, 2000);
    if (!message) return json(400, { error: "Type a question first." });

    const db = adminClient();
    const { data: allowed, error: rateErr } = await db.rpc("reserve_ai_request", { p_user_id: user.id });
    if (rateErr) throw rateErr;
    if (!allowed) return json(429, { error: "You've hit the hourly limit for the advisor. Try again in a little while." });

    // Build the snapshot from the database, not from anything the browser sent.
    const keys = Object.keys(TABLES) as (keyof typeof TABLES)[];
    const results = await Promise.all(keys.map((k) => db.from(TABLES[k]).select("*").eq("user_id", user.id).limit(3000)));
    const data: FinanceData = { ...EMPTY_DATA };
    keys.forEach((k, i) => { (data as Record<string, unknown>)[k] = results[i].data ?? []; });
    const snapshot = advisorSnapshot(data);

    const { data: history } = await db.from("ai_messages").select("role,content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    const past = (history ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    // The API needs the conversation to start with a user turn.
    while (past.length && past[0].role !== "user") past.shift();

    const anthropic = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
    const res = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 900,
      system: `${SYSTEM}\n\n<snapshot>\n${JSON.stringify(snapshot)}\n</snapshot>`,
      messages: [...past, { role: "user", content: message }],
    });
    const reply = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || "I couldn't come up with an answer. Try rephrasing the question.";

    await db.from("ai_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);
    return json(200, { reply });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: "/api/advisor" };
