"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "@/components/toast";
import { Button, Card, Field, inputCls } from "@/components/ui";

type StaffRole = "ADMIN" | "JUDGE" | "RECEPTION";
const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "ADMIN", label: "Committee administrator" },
  { value: "JUDGE", label: "Judge" },
  { value: "RECEPTION", label: "Reception" },
];

/** Readable temporary password: letters + digits, no look-alike characters. */
function generate() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  let pw = "";
  while (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) pw = Array.from({ length: 12 }, pick).join("");
  return pw;
}

export function StaffCreate() {
  const r = useRouter();
  const [fullName, setFullName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("RECEPTION");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/staff", { body: { fullName, login, password, role } });
      toast("Staff login created");
      setFullName(""); setLogin(""); setPassword(""); setRole("RECEPTION");
      r.refresh();
    } catch {}
    setBusy(false);
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-stone-900">Add staff login</h2>
        <p className="text-xs text-stone-500">Each person gets their own username, password and access role.</p>
      </div>
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Full name"><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Staff member name" /></Field>
        <Field label="Email or username"><input className={inputCls} value={login} onChange={(e) => setLogin(e.target.value.toLowerCase())} placeholder="name or name@example.com" autoCapitalize="none" spellCheck={false} /></Field>
        <Field label="Role"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <Field label="Temporary password">
          <div className="flex gap-2">
            <div className="relative flex-1"><input className={`${inputCls} pe-20 font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" autoComplete="new-password" /><button type="button" onClick={() => setPassword(generate())} className="absolute inset-y-0 end-0 px-3 text-xs font-medium text-brand-600 hover:text-brand-700">Generate</button></div>
            <Button disabled={busy || fullName.trim().length < 2 || !login.trim() || password.length < 8}>{busy ? "Adding…" : "Add"}</Button>
          </div>
        </Field>
      </form>
    </Card>
  );
}

export function StaffCredentials({ id, username, role: initialRole, hasPassword, locked }: { id: string; username: string | null; role: StaffRole; hasPassword: boolean; locked: boolean }) {
  const r = useRouter();
  const [login, setLogin] = useState(username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>(initialRole);
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try { await api(`/api/admin/staff/${id}`, { method: "PATCH", body }); toast(done); setPassword(""); r.refresh(); } catch {}
    setBusy(false);
  }

  return (
    <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 lg:grid-cols-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save({ login }, "Username saved"); }}>
        <input className={inputCls} value={login} onChange={(e) => setLogin(e.target.value.toLowerCase())} placeholder="email or username" autoCapitalize="none" spellCheck={false} aria-label="Email or username" />
        <Button variant="secondary" disabled={busy || !login.trim() || login === (username ?? "")}>Save</Button>
      </form>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save({ role }, "Staff role updated"); }}>
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as StaffRole)} aria-label="Staff role">{ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <Button variant="secondary" disabled={busy || role === initialRole}>Save</Button>
      </form>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save({ password }, hasPassword ? "Password reset — share it with them securely" : "Password set"); }}>
        <div className="relative flex-1">
          <input className={`${inputCls} pe-20 font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={hasPassword ? "New password" : "Set a password"} aria-label="New password" autoComplete="new-password" />
          <button type="button" onClick={() => setPassword(generate())} className="absolute inset-y-0 end-0 px-3 text-xs font-medium text-brand-600 hover:text-brand-700">Generate</button>
        </div>
        <Button disabled={busy || password.length < 8 || !(username || login)}>{hasPassword ? "Reset" : "Set"}</Button>
      </form>
      {locked && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 lg:col-span-3">
          Locked after too many wrong passwords.
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => save({ unlock: true }, "Account unlocked")}>Unlock now</Button>
        </div>
      )}
      <p className="text-xs text-stone-500 lg:col-span-3">Passwords need at least 8 characters with a letter and a number. Staff can change their own under My account.</p>
    </div>
  );
}
