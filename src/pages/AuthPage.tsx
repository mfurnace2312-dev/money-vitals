import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { supabase, friendlyError } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Ecg, Logo } from "@/components/brand";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";

type Mode = "signin" | "signup" | "forgot" | "reset";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Only show "Continue with Google" when Google is actually switched on in Supabase. */
function useGoogleEnabled() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json())
      .then((s) => setOn(Boolean(s?.external?.google)))
      .catch(() => setOn(false));
  }, []);
  return on;
}

export default function AuthPage({ initial }: { initial: Mode }) {
  const { user, loading, recovering } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = params.get("next") || "/dashboard";
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const google = useGoogleEnabled();

  useEffect(() => setMode(initial), [initial]);
  useEffect(() => { if (recovering) setMode("reset"); }, [recovering]);
  useEffect(() => { setErr(null); setInfo(null); }, [mode]);

  if (loading) return <Spinner />;
  if (user && mode !== "reset") return <Navigate to={next} replace />;

  const origin = window.location.origin;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    const mail = email.trim().toLowerCase();
    if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(mail)) return setErr("Enter a valid email address.");
    if ((mode === "signup" || mode === "reset") && password.length < 8) return setErr("Password must be at least 8 characters.");
    if (mode === "signin" && !password) return setErr("Enter your password.");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        nav(next, { replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { emailRedirectTo: `${origin}/dashboard`, data: { display_name: name.trim() || null } },
        });
        if (error) throw error;
        // Supabase hides "already registered" for privacy; an empty identities list means exactly that.
        if (data.user && data.user.identities?.length === 0) throw new Error("User already registered");
        if (data.session) nav("/dashboard", { replace: true });
        else setSentTo(mail);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${origin}/reset-password` });
        if (error) throw error;
        setInfo("If that email has an account, a reset link is on its way. Check your inbox (and spam).");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        nav("/dashboard", { replace: true });
      }
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}${next}` } });
    if (error) setErr(friendlyError(error));
  };

  const resend = async () => {
    if (!sentTo) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: `${origin}/dashboard` } });
    setBusy(false);
    setInfo(error ? friendlyError(error) : "Sent again. It can take a minute to arrive.");
  };

  const heading = { signin: "Welcome back", signup: "Create your free account", forgot: "Reset your password", reset: "Choose a new password" }[mode];
  const sub = {
    signin: "Sign in to see where your money went and what to do next.",
    signup: "Free forever for budgets, bills, debt and savings. No card needed.",
    forgot: "We'll email you a link to set a new password.",
    reset: "Pick something at least 8 characters long.",
  }[mode];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {sentTo ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pulse-50 text-pulse-500"><MailCheck className="h-6 w-6" /></div>
              <h1 className="font-display text-4xl">Check your email</h1>
              <p className="mt-2 text-sm text-ink-mute">We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Click it to finish setting up your account.</p>
              {info && <div className="mt-4"><Alert tone="info">{info}</Alert></div>}
              <div className="mt-6 flex flex-col gap-2">
                <Button variant="secondary" onClick={resend} loading={busy}>Resend the email</Button>
                <Button variant="ghost" onClick={() => { setSentTo(null); setMode("signin"); }}>Back to sign in</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-4xl">{heading}</h1>
              <p className="mt-2 text-sm text-ink-mute">{sub}</p>

              {google && (mode === "signin" || mode === "signup") && (
                <>
                  <Button variant="secondary" className="mt-6 w-full" onClick={withGoogle} type="button">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z"/></svg>
                    Continue with Google
                  </Button>
                  <div className="my-5 flex items-center gap-3 text-xs text-ink-mute"><span className="h-px flex-1 bg-paper-line" />or use email<span className="h-px flex-1 bg-paper-line" /></div>
                </>
              )}

              <form onSubmit={submit} className={google && (mode === "signin" || mode === "signup") ? "space-y-4" : "mt-7 space-y-4"} noValidate>
                {mode === "signup" && (
                  <Field label="First name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></Field>
                )}
                {mode !== "reset" && (
                  <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
                )}
                {mode !== "forgot" && (
                  <Field label={mode === "reset" ? "New password" : "Password"} hint={mode === "signin" ? undefined : "At least 8 characters"}>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} />
                  </Field>
                )}
                {err && <Alert>{err}</Alert>}
                {info && <Alert tone="good">{info}</Alert>}
                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  {{ signin: "Sign in", signup: "Create account", forgot: "Send reset link", reset: "Save new password" }[mode]}
                </Button>
              </form>

              <div className="mt-6 space-y-2 text-center text-sm text-ink-mute">
                {mode === "signin" && (
                  <>
                    <button onClick={() => setMode("forgot")} className="font-semibold text-pulse-500 hover:underline">Forgot password?</button>
                    <div>New here? <Link to="/signup" className="font-semibold text-pulse-500 hover:underline">Create an account</Link></div>
                  </>
                )}
                {mode === "signup" && <div>Already have an account? <Link to="/signin" className="font-semibold text-pulse-500 hover:underline">Sign in</Link></div>}
                {mode === "forgot" && <button onClick={() => setMode("signin")} className="font-semibold text-pulse-500 hover:underline">Back to sign in</button>}
              </div>
              {mode === "signup" && (
                <p className="mt-6 text-center text-xs text-ink-mute">By creating an account you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Notice</Link>.</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-pulse-500 lg:block">
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <p className="max-w-md font-display text-6xl">{mode === "signup" ? "Let's take your first reading." : "Welcome back to your numbers."}</p>
          <div>
            <Ecg draw className="h-28 w-full text-white" width={3.5} />
            <ul className="mt-8 space-y-3 text-[15px] text-white/80">
              <li className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-400" />Real debt-to-income math, the way lenders calculate it</li>
              <li className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-vital-400" />A payoff plan with your actual debt-free date</li>
              <li className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white" />An advisor that answers with your own numbers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
