"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button, Field, inputCls } from "@/components/ui";

export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const strong = next.length >= 8 && /[A-Za-z]/.test(next) && /\d/.test(next);
  const mismatch = confirm.length > 0 && confirm !== next;

  return (
    <form className="mt-4 space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { await api("/api/auth/password", { body: { current, next } }); toast("Password changed"); setCurrent(""); setNext(""); setConfirm(""); } catch {}
      setBusy(false);
    }}>
      <Field label="Current password"><input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
      <Field label="New password" hint="At least 8 characters, with a letter and a number">
        <input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password" hint={mismatch ? "Passwords do not match" : undefined}>
        <input type="password" autoComplete="new-password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button disabled={busy || !current || !strong || confirm !== next}>Change password</Button>
    </form>
  );
}
