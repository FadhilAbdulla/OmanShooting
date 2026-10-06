"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, inputCls } from "@/components/ui";
import { toast } from "@/components/toast";
import { GOVERNORATES } from "@/lib/oman";

type U = { fullName: string; tribe: string; mobile: string; email: string; gender: string; hand: string; dob: string; governorate: string; wilayat: string; photo: string | null; civilId: string; dobLocked: boolean };

/** MEM-09: crop photo to a 512×512 circle-friendly square PNG in the browser */
async function cropSquare(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const size = Math.min(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 512, 512);
  return c.toDataURL("image/png");
}

export function ProfileForm({ user }: { user: U }) {
  const r = useRouter();
  const [f, setF] = useState(user);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof U) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { const { civilId: _c, dobLocked: _d, ...body } = f; void _c; void _d; await api("/api/me", { method: "PATCH", body }); toast("Profile saved"); r.refresh(); } catch {} setBusy(false); }}>
      <Field label="Civil ID" hint="Locked — contact the Committee to change it"><input className={`${inputCls} bg-sand-100`} value={f.civilId} disabled /></Field>
      <Field label="Photo"><input type="file" accept="image/*" capture="user" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, photo: await cropSquare(file) }); }} /></Field>
      <Field label="Full name"><input className={inputCls} value={f.fullName} onChange={set("fullName")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tribe"><input className={inputCls} value={f.tribe} onChange={set("tribe")} /></Field>
        <Field label="Mobile"><input className={inputCls} value={f.mobile} onChange={set("mobile")} /></Field>
        <Field label="Gender"><select className={inputCls} value={f.gender} onChange={set("gender")}><option value="MALE">Male</option><option value="FEMALE">Female</option></select></Field>
        <Field label="Dominant hand"><select className={inputCls} value={f.hand} onChange={set("hand")}><option value="RIGHT">Right</option><option value="LEFT">Left</option></select></Field>
        <Field label="Date of birth" hint={f.dobLocked ? "Locked — decides age categories" : undefined}><input type="date" className={`${inputCls} ${f.dobLocked ? "bg-sand-100" : ""}`} disabled={f.dobLocked} value={f.dob} onChange={set("dob")} /></Field>
        <Field label="Governorate"><select className={inputCls} value={f.governorate} onChange={set("governorate")}>{GOVERNORATES.map((g) => <option key={g}>{g}</option>)}</select></Field>
      </div>
      <Field label="Wilayat"><input className={inputCls} value={f.wilayat} onChange={set("wilayat")} /></Field>
      <Field label="Email"><input className={inputCls} value={f.email} onChange={set("email")} /></Field>
      <Button disabled={busy} className="w-full">Save</Button>
    </form>
  );
}

export function CancelButton({ id }: { id: string }) {
  const r = useRouter();
  return (
    <button className="text-xs text-rose-600 hover:underline" onClick={async () => {
      if (!confirm("Cancel this booking? The target is released immediately. If you already paid, the Committee will arrange your refund.")) return;
      try { await api(`/api/bookings/${id}/cancel`, { body: {} }); toast("Booking cancelled — the target has been released"); r.replace("/me"); r.refresh(); } catch {}
    }}>Cancel</button>
  );
}
