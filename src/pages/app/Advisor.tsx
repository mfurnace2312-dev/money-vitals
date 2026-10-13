import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { callApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useToast } from "@/components/toast";
import { UpgradeGate } from "@/components/UpgradeGate";
import { Alert, Button, Card, PageHeader, Spinner, cx } from "@/components/ui";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  "Where should my next extra $200 go?",
  "Is my debt-to-income ratio good enough to buy a house?",
  "Which spending category should I cut first?",
  "How long until my emergency fund covers 3 months?",
];

/** Tiny formatter: paragraphs, **bold**, and "- " bullet lines. */
function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{inline(l.replace(/^#+\s*/, ""))}{j < lines.length - 1 && <br />}</span>)}</p>;
      })}
    </div>
  );
}

export default function Advisor() {
  const { user } = useAuth();
  const plan = usePlan();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("ai_messages").select("id,role,content").eq("user_id", user.id).order("created_at", { ascending: true }).limit(60)
      .then(({ data }) => { setMsgs((data as Msg[]) ?? []); setLoading(false); });
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setErr(null);
    setDraft("");
    setMsgs((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: message }]);
    setSending(true);
    const { data, error } = await callApi<{ reply: string }>("/api/advisor", { message });
    setSending(false);
    if (error) { setErr(error); setMsgs((m) => m.slice(0, -1)); setDraft(message); return; }
    setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data!.reply }]);
  };

  const clear = async () => {
    if (!user) return;
    const { error } = await supabase.from("ai_messages").delete().eq("user_id", user.id);
    if (error) return toast("Couldn't clear the conversation.", "bad");
    setMsgs([]);
  };

  const submit = (e: FormEvent) => { e.preventDefault(); void send(draft); };

  return (
    <div>
      <PageHeader title="AI advisor" sub="Answers built from your actual budget, bills, debts and goals."
        action={msgs.length > 0 && plan.hasPremium ? <Button variant="ghost" size="sm" onClick={clear}><Trash2 className="h-4 w-4" /> Clear chat</Button> : undefined} />

      <UpgradeGate need="premium" feature="The AI advisor">
        <Card pad={false} className="flex h-[calc(100vh-220px)] min-h-[460px] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            {loading ? <Spinner /> : msgs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="rounded-full bg-ink p-3 text-gold-400"><Sparkles className="h-5 w-5" /></div>
                <h2 className="mt-4 text-lg font-semibold">Ask anything about your money</h2>
                <p className="mt-1 max-w-sm text-sm text-ink-mute">The advisor reads the numbers you've entered, so the more complete your budget, the sharper the answers.</p>
                <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-2xl border-2 border-ink/[.06] bg-white px-4 py-3 text-left text-sm hover:border-ink/25">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                    m.role === "user" ? "rounded-br-md bg-pulse-500 text-white" : "rounded-bl-md bg-paper")}>
                    {m.role === "assistant" ? <Rich text={m.content} /> : m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-paper px-4 py-3">
                  <span className="inline-flex gap-1" aria-label="Advisor is thinking">
                    {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink-mute" style={{ animationDelay: `${i * 120}ms` }} />)}
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-paper-line p-3 sm:p-4">
            {err && <div className="mb-3"><Alert>{err}</Alert></div>}
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
                rows={1}
                maxLength={2000}
                placeholder="Ask about your budget, debt, savings…"
                aria-label="Message the advisor"
                className="input max-h-40 min-h-[44px] flex-1 resize-none py-2.5"
              />
              <Button type="submit" className="h-11 w-11 shrink-0 !p-0" disabled={!draft.trim()} loading={sending} aria-label="Send">
                {!sending && <ArrowUp className="h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-2 text-[11px] text-ink-mute">General education, not individualized financial advice. Double-check important decisions.</p>
          </div>
        </Card>
      </UpgradeGate>
    </div>
  );
}
