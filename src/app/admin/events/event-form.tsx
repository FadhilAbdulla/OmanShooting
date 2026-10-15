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
      <Card className="p-5">
        <h2 className="font-semibold">Booking &amp; payment</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Hold time (min)" hint="How long a chosen target is reserved while the shooter pays"><input type="number" min={2} max={60} className={inputCls} value={f.holdMinutes} onChange={(e) => set("holdMinutes", +e.target.value)} /></Field>
          <Field label="Cash / transfer deadline (hours)" hint="Unpaid bookings are released after this"><input type="number" min={1} className={inputCls} value={f.paymentDeadlineHours} onChange={(e) => set("paymentDeadlineHours", +e.target.value)} /></Field>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowCash} onChange={(e) => set("allowCash", e.target.checked)} /> Accept cash on site</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowTransfer} onChange={(e) => set("allowTransfer", e.target.checked)} /> Accept bank transfer</label>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">Cancellation policy</h2>
            <p className="text-sm text-stone-600">Applies to shooters cancelling themselves. Staff can always cancel on a shooter&apos;s behalf.</p>
          </div>
          {(f.cancelHours !== 48 || f.maxCancellations !== 2) && (
            <button type="button" className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setF((x) => ({ ...x, cancelHours: 48, maxCancellations: 2 }))}>Reset to default (48 h · 2)</button>
          )}
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-medium text-stone-700">Cancellation window closes</span>
            <div className="flex flex-wrap gap-2">
              {[24, 48, 72].map((h) => (
                <button key={h} type="button" onClick={() => set("cancelHours", h)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${f.cancelHours === h ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-sand-300 bg-white hover:bg-sand-100"}`}>
                  {h} h{h === 48 ? " (default)" : ""}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-sm text-stone-600">
                or <input type="number" min={0} max={720} className={`${inputCls} h-9 w-20`} value={f.cancelHours} onChange={(e) => set("cancelHours", Math.max(0, +e.target.value))} /> hours
              </label>
            </div>
            <span className="mt-1 block text-xs text-stone-500">Counted back from the start of the shooter&apos;s own group. Target changes close at the same time.</span>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-stone-700">Maximum cancellations per shooter</span>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((n) => (
                <button key={n} type="button" onClick={() => set("maxCancellations", n)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${f.maxCancellations === n ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-sand-300 bg-white hover:bg-sand-100"}`}>
                  {n === 0 ? "None allowed" : n}{n === 2 ? " (default)" : ""}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-sm text-stone-600">
                or <input type="number" min={0} max={50} className={`${inputCls} h-9 w-20`} value={f.maxCancellations} onChange={(e) => set("maxCancellations", Math.max(0, +e.target.value))} />
              </label>
            </div>
            <span className="mt-1 block text-xs text-stone-500">Per shooter across the whole championship.</span>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-sand-50 p-3 text-sm text-stone-700">
          <span className="font-medium">Shooters will see:</span>{" "}
          {f.maxCancellations === 0
            ? <>Bookings cannot be cancelled. You can move to another target until {f.cancelHours} hours before your group starts.</>
            : <>You can cancel up to {f.cancelHours} hours before your group starts, at most {f.maxCancellations} time{f.maxCancellations === 1 ? "" : "s"} in this championship. You can also move to another target until then.</>}
        </div>
      </Card>
      <Button size="lg" disabled={busy}>{id ? "Save changes" : "Create draft & add competitions →"}</Button>
    </form>
  );
}
