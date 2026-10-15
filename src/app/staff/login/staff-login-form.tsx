"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { safeNext } from "@/lib/utils";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/logo";

function Form({ demo }: { demo: boolean }) {
  const r = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await api("/api/auth/staff-login", { body: { login, password }, quiet: true });
      r.push(next === "/" ? "/admin" : next);
      r.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-12 w-12" />
        <h1 className="text-xl font-bold">Committee staff sign-in</h1>
        <p className="text-sm text-stone-600">For administrators, judges and reception.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email or username">
          <input className={inputCls} autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} value={login}
            onChange={(e) => { setLogin(e.target.value); setError(null); }} placeholder="name@example.com" />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input className={`${inputCls} pe-16`} type={show ? "text" : "password"} autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 end-0 px-3 text-xs font-medium text-stone-500 hover:text-stone-800">{show ? "Hide" : "Show"}</button>
          </div>
        </Field>
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        <Button className="w-full" size="lg" disabled={busy || !login.trim() || !password}>{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="text-center text-xs text-stone-500">Forgot your password? Ask a committee administrator to reset it.</p>
      </form>
      <p className="border-t border-sand-100 pt-4 text-center text-sm text-stone-600">Shooter? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in with your civil ID</Link></p>
      {demo && (
        <div className="rounded-lg bg-sand-100 p-3 text-xs text-stone-600">
          <div className="mb-1 font-medium text-stone-700">Demo accounts — password <b className="font-mono">root123</b></div>
          {["admin", "judge", "reception"].map((r) => (
            <button key={r} type="button" onClick={() => { setLogin(`${r}@shooting.demo`); setPassword("root123"); setError(null); }}
              className="me-3 font-mono text-brand-700 hover:underline">{r}@shooting.demo</button>
          ))}
        </div>
      )}
    </Card>
  );
}

export function StaffLoginForm({ demo }: { demo: boolean }) {
  return <Suspense><Form demo={demo} /></Suspense>;
}
