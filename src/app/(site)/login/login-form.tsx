"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { toast } from "@/components/toast";
import { safeNext } from "@/lib/utils";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/logo";

export type AuthMode = "signin" | "signup";

const COPY: Record<AuthMode, { title: string; sub: string; demo: React.ReactNode }> = {
  signin: {
    title: "Sign in",
    sub: "Enter your civil ID — we'll text a one-time code to the mobile number on your membership.",
    demo: <>Demo shooters: <b>20000001</b>–<b>20000040</b></>,
  },
  signup: {
    title: "Create your membership",
    sub: "Verify your civil ID and mobile number, then complete your shooter profile in about a minute.",
    demo: <>Demo: use any new civil ID (e.g. <b>30000001</b>) and any mobile number</>,
  },
};

/** Errors that point the person to the other door instead of a dead end. */
const REDIRECTS: Record<string, { href: string; label: string }> = {
  NOT_MEMBER: { href: "/signup", label: "Create your membership" },
  ALREADY_MEMBER: { href: "/login", label: "Go to sign in" },
  STAFF_ACCOUNT: { href: "/staff/login", label: "Open the staff portal" },
};

function AuthFlow({ mode, demo }: { mode: AuthMode; demo: boolean }) {
  const r = useRouter();
  const next = safeNext(useSearchParams().get("next"));  // "/" means "no explicit destination"
  const withNext = (href: string) => (next === "/" ? href : `${href}?next=${encodeURIComponent(next)}`);
  const copy = COPY[mode];
  const [civilId, setCivilId] = useState("");
  const [mobile, setMobile] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"id" | "otp">("id");
  const [dev, setDev] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{ message: string; href?: string; label?: string } | null>(null);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const needsMobile = mode === "signup";
  const ready = civilId.length >= 6 && (!needsMobile || /^[79]\d{7}$/.test(mobile));

  async function requestCode() {
    const res = await api<{ devCode?: string; sentTo: string }>("/api/auth/otp", {
      body: { civilId, mobile: needsMobile ? mobile : undefined, intent: mode }, quiet: true,
    });
    setDev(res.devCode ?? null); setSentTo(res.sentTo); setCooldown(30);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNotice(null);
    try {
      await requestCode();
      setStep("otp");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong";
      const link = err instanceof ApiError && err.code ? REDIRECTS[err.code] : undefined;
      if (link) setNotice({ message, href: withNext(link.href), label: link.label });
      else toast(message, "err");
    }
    setBusy(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await api<{ register?: boolean; roles?: string[] }>("/api/auth/verify", { body: { civilId, code } });
      if (res.register) { r.push(`/register?next=${encodeURIComponent(next)}`); r.refresh(); } // refresh so the header knows onboarding has started
      else {
        r.push(next === "/" ? "/me" : next);
        r.refresh();
      }
    } catch { setBusy(false); }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-12 w-12" />
        <h1 className="text-xl font-bold">{copy.title}</h1>
        <p className="text-sm text-stone-600">{copy.sub}</p>
      </div>
      {step === "id" ? (
        <form onSubmit={send} className="space-y-4">
          <Field label="Civil ID number">
            <input className={inputCls} inputMode="numeric" autoFocus value={civilId}
              onChange={(e) => { setCivilId(e.target.value.replace(/\D/g, "")); setNotice(null); }} placeholder="e.g. 12345678" />
          </Field>
          {needsMobile && (
            <Field label="Mobile number" hint="We'll text your verification code to this number.">
              <div className="flex">
                <span className="inline-flex items-center rounded-s-lg border border-e-0 border-sand-300 bg-sand-100 px-3 text-sm text-stone-600" dir="ltr">+968</span>
                <input className={`${inputCls} rounded-s-none`} inputMode="tel" dir="ltr" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 8))} placeholder="9XXXXXXX" />
              </div>
            </Field>
          )}
          {notice && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {notice.message}
              {notice.href && <Link href={notice.href} className="mt-1 block font-semibold text-brand-700 underline">{notice.label} →</Link>}
            </div>
          )}
          <Button className="w-full" size="lg" disabled={busy || !ready}>Send verification code</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <Field label="6-digit code" hint={`Sent by SMS to ${sentTo} · civil ID ${civilId}`}>
            <input className={`${inputCls} text-center text-2xl tracking-[0.5em]`} inputMode="numeric" autoFocus maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </Field>
          {dev && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-900">
              <div className="text-xs">Demo mode — no SMS is sent. Your code is:</div>
              <div className="my-1 text-2xl font-bold tracking-[0.3em] tabular">{dev}</div>
              <button type="button" className="font-medium underline" onClick={() => setCode(dev)}>Fill it in</button>
            </div>
          )}
          <Button className="w-full" size="lg" disabled={busy || code.length !== 6}>Verify</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="text-stone-500 hover:text-stone-800" onClick={() => { setStep("id"); setCode(""); }}>Change details</button>
            <button type="button" disabled={cooldown > 0 || busy} className="font-medium text-brand-600 disabled:text-stone-400"
              onClick={async () => {
                setBusy(true);
                try { await requestCode(); setCode(""); toast("A new code has been sent", "info"); } catch (err) { toast(err instanceof ApiError ? err.message : "Something went wrong", "err"); }
                setBusy(false);
              }}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
      {mode === "signin" && <p className="border-t border-sand-100 pt-4 text-center text-sm text-stone-600">New to the platform? <Link href={withNext("/signup")} className="font-semibold text-brand-700 hover:underline">Create your membership</Link></p>}
      {mode === "signup" && <p className="border-t border-sand-100 pt-4 text-center text-sm text-stone-600">Already a member? <Link href={withNext("/login")} className="font-semibold text-brand-700 hover:underline">Sign in</Link></p>}
      {demo && <p className="rounded-lg bg-sand-100 p-2 text-xs text-stone-600">{copy.demo}</p>}
    </Card>
  );
}

export function LoginForm({ mode = "signin", demo }: { mode?: AuthMode; demo: boolean }) {
  return <Suspense><AuthFlow mode={mode} demo={demo} /></Suspense>;
}
