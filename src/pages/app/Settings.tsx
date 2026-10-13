import { useEffect, useState, type FormEvent } from "react";
import { useFinance, TABLES, type Collection } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { supabase, friendlyError } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const { data, loading, updateProfile, reload } = useFinance();
  const { user } = useAuth();
  const toast = useToast();
  const p = data.profile;

  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("biweekly");
  const [front, setFront] = useState("28");
  const [back, setBack] = useState("36");
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const [confirm, setConfirm] = useState("");
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    if (!p) return;
    setName(p.display_name ?? "");
    setSchedule(p.pay_schedule ?? "biweekly");
    setFront(String(p.dti_front_max ?? 28));
    setBack(String(p.dti_back_max ?? 36));
  }, [p]);

  if (loading) return <Spinner />;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const err = await updateProfile({ display_name: name.trim() || null, pay_schedule: schedule, dti_front_max: Number(front) || 28, dti_back_max: Number(back) || 36 });
    setSaving(false);
    toast(err ?? "Settings saved.", err ? "bad" : "good");
  };

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    if (pw.length < 8) return setPwErr("Password must be at least 8 characters.");
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return setPwErr(friendlyError(error));
    setPw("");
    toast("Password updated.");
  };

  const wipe = async () => {
    if (!user || confirm !== "DELETE") return;
    setWiping(true);
    const keys = Object.keys(TABLES) as Collection[];
    const results = await Promise.all(keys.map((k) => supabase.from(TABLES[k]).delete().eq("user_id", user.id)));
    await supabase.from("monthly_financial_records").delete().eq("user_id", user.id);
    await supabase.from("ai_messages").delete().eq("user_id", user.id);
    await updateProfile({ demo_seeded: false });
    setWiping(false);
    setConfirm("");
    const failed = results.find((r) => r.error);
    if (failed?.error) toast(friendlyError(failed.error), "bad");
    else toast("All your financial records were cleared.");
    await reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader title="Profile" sub={user?.email} />
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Pay schedule">
            <Select value={schedule} onChange={(e) => setSchedule(e.target.value)} options={[{ value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Every two weeks" }, { value: "semimonthly", label: "Twice a month" }, { value: "monthly", label: "Monthly" }, { value: "irregular", label: "Irregular" }]} />
          </Field>
          <Field label="Front-end DTI limit (%)" hint="Housing ÷ gross income. Common lender limit: 28%"><Input type="number" value={front} onChange={(e) => setFront(e.target.value)} /></Field>
          <Field label="Back-end DTI limit (%)" hint="All debt ÷ gross income. Common lender limit: 36%"><Input type="number" value={back} onChange={(e) => setBack(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save settings</Button></div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <form onSubmit={changePw} className="flex max-w-md flex-col gap-3">
          <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          {pwErr && <Alert>{pwErr}</Alert>}
          <div><Button type="submit" variant="secondary" loading={pwBusy}>Update password</Button></div>
        </form>
      </Card>

      <Card className="border-alert-500/30">
        <CardHeader title="Clear my data" sub="Removes every budget, bill, debt, goal, asset, subscription and transaction in your account. Your login stays. This can't be undone." />
        <div className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
          <Field label='Type DELETE to confirm' className="flex-1"><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <Button variant="danger" disabled={confirm !== "DELETE"} loading={wiping} onClick={wipe}>Clear everything</Button>
        </div>
      </Card>
    </div>
  );
}
