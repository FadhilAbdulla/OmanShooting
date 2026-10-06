"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "@/components/toast";
import { safeNext } from "@/lib/utils";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/logo";

function Login({ demo }: { demo: boolean }) {
  const r = useRouter();
  const next = safeNext(useSearchParams().get("next"));  // "/" means "no explicit destination"
  const [civilId, setCivilId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"id" | "otp">("id");
  const [dev, setDev] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const res = await api<{ devCode?: string }>("/api/auth/otp", { body: { civilId } }); setDev(res.devCode ?? null); setStep("otp"); setCooldown(30); } catch {}
    setBusy(false);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await api<{ register?: boolean; roles?: string[] }>("/api/auth/verify", { body: { civilId, code } });
      if (res.register) r.push(`/register?next=${encodeURIComponent(next)}`);
      else {
        // No explicit destination → staff go to the admin console, shooters to their booking dashboard
        const home = res.roles?.some((x) => x !== "SHOOTER") ? "/admin" : "/me";
        r.push(next === "/" ? home : next);
        r.refresh();
      }
    } catch { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card className="space-y-5 p-6">
        <div className="flex flex-col items-center gap-2 text-center"><Logo className="h-12 w-12" /><h1 className="text-xl font-bold">Sign in or join</h1><p className="text-sm text-stone-600">Enter your civil ID — no password needed. New to the platform? We&apos;ll set up your membership right after you verify.</p></div>
        {step === "id" ? (
          <form onSubmit={send} className="space-y-4">
            <Field label="Civil ID number"><input className={inputCls} inputMode="numeric" autoFocus value={civilId} onChange={(e) => setCivilId(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 12345678" /></Field>
            <Button className="w-full" size="lg" disabled={busy || civilId.length < 6}>Send verification code</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <Field label="6-digit code" hint={`Sent by SMS for civil ID ${civilId}`}>
              <input className={`${inputCls} text-center text-2xl tracking-[0.5em]`} inputMode="numeric" autoFocus maxLength={6} value={code}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCode(v); }} />
            </Field>
            {dev && <div className="rounded-lg bg-amber-50 p-2 text-center text-sm text-amber-900">Dev mode code: <b className="tabular">{dev}</b> <button type="button" className="underline" onClick={() => setCode(dev)}>fill</button></div>}
            <Button className="w-full" size="lg" disabled={busy || code.length !== 6}>Verify</Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="text-stone-500 hover:text-stone-800" onClick={() => { setStep("id"); setCode(""); }}>Change civil ID</button>
              <button type="button" disabled={cooldown > 0 || busy} className="font-medium text-brand-600 disabled:text-stone-400"
                onClick={async () => {
                  setBusy(true);
                  try { const res = await api<{ devCode?: string }>("/api/auth/otp", { body: { civilId } }); setDev(res.devCode ?? null); setCode(""); setCooldown(30); toast("A new code has been sent", "info"); } catch {}
                  setBusy(false);
                }}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
        {demo && <p className="rounded-lg bg-sand-100 p-2 text-xs text-stone-600">Demo accounts: admin <b>10000001</b> · judge <b>10000002</b> · reception <b>10000003</b> · shooters <b>20000001</b>–<b>20000040</b></p>}
      </Card>
    </div>
  );
}

export function LoginForm({ demo }: { demo: boolean }) {
  return <Suspense><Login demo={demo} /></Suspense>;
}
