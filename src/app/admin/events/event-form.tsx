"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { toast } from "@/components/toast";

export type EventFormValue = {
  nameEn: string; nameAr: string; descriptionEn: string; descriptionAr: string; location: string; startDate: string; endDate: string;
  regOpensAt: string; regClosesAt: string; holdMinutes: number; cancelHours: number; maxCancellations: number; paymentDeadlineHours: number;
  allowCash: boolean; allowTransfer: boolean;
};

const addDays = (d: string, n: number) => new Date(new Date(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function EventForm({ id, initial }: { id?: string; initial?: EventFormValue }) {
  const r = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const start = addDays(today, 21);
  const [f, setF] = useState<EventFormValue>(initial ?? {
    nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", location: "Muscat — Al Amerat Range", startDate: start, endDate: addDays(start, 2),
    regOpensAt: `${today}T08:00`, regClosesAt: `${addDays(start, -1)}T22:00`, holdMinutes: 10, cancelHours: 48, maxCancellations: 2, paymentDeadlineHours: 24,
    allowCash: true, allowTransfer: true,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof EventFormValue>(k: K, v: EventFormValue[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: keyof EventFormValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never);

  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        if (id) { await api(`/api/admin/events/${id}`, { method: "PATCH", body: f }); toast("Saved"); r.refresh(); }
        else { const res = await api<{ id: string }>("/api/admin/events", { body: f }); r.push(`/admin/events/${res.id}?tab=competitions`); }
      } catch {}
      setBusy(false);
    }}>
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Name (English)"><input className={inputCls} required value={f.nameEn} onChange={text("nameEn")} placeholder="Ministry Championship 2026" /></Field>
        <Field label="Name (Arabic)"><input dir="rtl" className={inputCls} required value={f.nameAr} onChange={text("nameAr")} placeholder="بطولة الوزارة ٢٠٢٦" /></Field>
        <Field label="Description (English)"><textarea className={`${inputCls} h-20 py-2`} value={f.descriptionEn} onChange={text("descriptionEn")} /></Field>
        <Field label="Description (Arabic)"><textarea dir="rtl" className={`${inputCls} h-20 py-2`} value={f.descriptionAr} onChange={text("descriptionAr")} /></Field>
        <Field label="Location / range" className="sm:col-span-2"><input className={inputCls} required value={f.location} onChange={text("location")} /></Field>
        <Field label="Start date"><input type="date" className={inputCls} value={f.startDate} onChange={(e) => {
          const v = e.target.value; const len = (new Date(f.endDate).getTime() - new Date(f.startDate).getTime()) / 86_400_000;
          // Automation: keep event length and move registration close to the day before
          setF((x) => ({ ...x, startDate: v, endDate: addDays(v, Math.max(0, len)), regClosesAt: `${addDays(v, -1)}T22:00` }));
        }} /></Field>
        <Field label="End date"><input type="date" className={inputCls} value={f.endDate} min={f.startDate} onChange={text("endDate")} /></Field>
        <Field label="Registration opens"><input type="datetime-local" className={inputCls} value={f.regOpensAt} onChange={text("regOpensAt")} /></Field>
        <Field label="Registration closes" hint="Auto-set to the evening before the start date"><input type="datetime-local" className={inputCls} value={f.regClosesAt} onChange={text("regClosesAt")} /></Field>
      </Card>
      <Card className="grid gap-4 p-5 sm:grid-cols-4">
        <Field label="Hold time (min)" hint="Soft hold to pay"><input type="number" className={inputCls} value={f.holdMinutes} onChange={(e) => set("holdMinutes", +e.target.value)} /></Field>
        <Field label="Cancel until (hours before)"><input type="number" className={inputCls} value={f.cancelHours} onChange={(e) => set("cancelHours", +e.target.value)} /></Field>
        <Field label="Max cancellations / shooter"><input type="number" className={inputCls} value={f.maxCancellations} onChange={(e) => set("maxCancellations", +e.target.value)} /></Field>
        <Field label="Cash payment deadline (hours)"><input type="number" className={inputCls} value={f.paymentDeadlineHours} onChange={(e) => set("paymentDeadlineHours", +e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowCash} onChange={(e) => set("allowCash", e.target.checked)} /> Accept cash on site</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowTransfer} onChange={(e) => set("allowTransfer", e.target.checked)} /> Accept bank transfer</label>
      </Card>
      <Button size="lg" disabled={busy}>{id ? "Save changes" : "Create draft & add competitions →"}</Button>
    </form>
  );
}
