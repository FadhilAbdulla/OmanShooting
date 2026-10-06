"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card, Empty, Field, inputCls } from "@/components/ui";
import { toast } from "@/components/toast";
import { cn, fmtDate, fmtTime } from "@/lib/utils";

type Slot = { id: string; targetNo: number; isLeftHand: boolean; state: string };
type Group = { id: string; label: string; date: string; startsAt: string; endsAt: string; isFinal: boolean; slots: Slot[] };
type Comp = { id: string; name: string; parentId: string | null; isParent: boolean; targets: number; groups: Group[] };

function daysBetween(a: string, b: string) {
  const out: string[] = [];
  for (let t = new Date(a).getTime(); t <= new Date(b).getTime(); t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function Schedule({ eventId, start, end, comps }: { eventId: string; start: string; end: string; comps: Comp[] }) {
  void eventId;
  const r = useRouter();
  const leaves = comps.filter((c) => !c.isParent);
  const allDates = useMemo(() => daysBetween(start, end), [start, end]);
  // Smart defaults: every leaf competition without groups, every event day, 08:00–12:00, 30-min groups
  const [sel, setSel] = useState<string[]>(() => { const empty = leaves.filter((c) => !c.groups.length).map((c) => c.id); return empty.length ? empty : leaves.map((c) => c.id); });
  const [dates, setDates] = useState<string[]>(allDates);
  const [f, setF] = useState({ startTime: "08:00", endTime: "12:00", durationMin: 30, gapMin: 10, targets: "" });
  const [preview, setPreview] = useState<{ date: string; label: string; startsAt: string; endsAt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [openComp, setOpenComp] = useState<string | null>(leaves[0]?.id ?? null);

  useEffect(() => {
    if (!sel.length || !dates.length) { setPreview([]); return; }
    const t = setTimeout(() => {
      api<{ preview: typeof preview }>("/api/admin/schedule", { body: { competitionIds: sel, dates, ...f, targets: f.targets ? Number(f.targets) : null, preview: true }, quiet: true })
        .then((x) => setPreview(x.preview)).catch(() => setPreview([]));
    }, 250);
    return () => clearTimeout(t);
  }, [sel, dates, f]);

  const perDay = preview.filter((p) => p.date === dates[0]).length;
  const toggle = (arr: string[], v: string, set: (x: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Batch schedule generator</h2>
          <p className="text-sm text-stone-600">Pick competitions and days, set the shooting window once — groups and every target are created automatically. Existing groups at the same time are skipped, so it is safe to run again.</p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-3 text-sm font-medium">Competitions
            <button className="text-xs font-normal text-brand-600" onClick={() => setSel(leaves.map((c) => c.id))}>all</button>
            <button className="text-xs font-normal text-stone-500" onClick={() => setSel([])}>none</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {leaves.map((c) => (
              <button key={c.id} onClick={() => toggle(sel, c.id, setSel)} className={cn("rounded-full border px-3 py-1 text-sm", sel.includes(c.id) ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 bg-white")}>
                {c.name} <span className="opacity-70">({c.groups.filter((g) => !g.isFinal).length})</span>
              </button>
            ))}
            {!leaves.length && <span className="text-sm text-stone-500">Add competitions first.</span>}
          </div>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium">Days</div>
          <div className="flex flex-wrap gap-1.5">
            {allDates.map((d) => <button key={d} onClick={() => toggle(dates, d, setDates)} className={cn("rounded-lg border px-3 py-1 text-sm", dates.includes(d) ? "border-brand-500 bg-brand-50 font-medium" : "border-sand-300 bg-white")}>{fmtDate(d + "T08:00:00Z")}</button>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="First group starts"><input type="time" className={inputCls} value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></Field>
          <Field label="Last group ends by"><input type="time" className={inputCls} value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></Field>
          <Field label="Group duration (min)"><input type="number" className={inputCls} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: +e.target.value })} /></Field>
          <Field label="Break between (min)"><input type="number" className={inputCls} value={f.gapMin} onChange={(e) => setF({ ...f, gapMin: +e.target.value })} /></Field>
          <Field label="Targets per group" hint="Blank = competition default"><input type="number" className={inputCls} value={f.targets} onChange={(e) => setF({ ...f, targets: e.target.value })} /></Field>
        </div>
        <div className="rounded-lg bg-sand-100 p-3 text-sm">
          <b>Preview:</b> {perDay} group(s)/day × {dates.length} day(s) × {sel.length} competition(s) = <b>{preview.length * sel.length}</b> groups
          {preview.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{preview.filter((p) => p.date === dates[0]).map((p) => <span key={p.startsAt} className="rounded bg-white px-2 py-0.5 text-xs tabular">{p.label} {fmtTime(p.startsAt)}–{fmtTime(p.endsAt)}</span>)}</div>}
        </div>
        <Button disabled={busy || !preview.length || !sel.length} onClick={async () => {
          setBusy(true);
          try {
            const res = await api<{ groups: number }>("/api/admin/schedule", { body: { competitionIds: sel, dates, ...f, targets: f.targets ? Number(f.targets) : null } });
            toast(`${res.groups} group(s) created with targets`); r.refresh();
          } catch {}
          setBusy(false);
        }}>Generate groups</Button>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Groups & target boards</h2>
        {!leaves.some((c) => c.groups.length) && <Empty>No groups yet.</Empty>}
        {leaves.filter((c) => c.groups.length).map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <button onClick={() => setOpenComp(openComp === c.id ? null : c.id)} className="flex w-full items-center justify-between px-4 py-3 text-start hover:bg-sand-50">
              <span className="font-medium">{c.name}</span><span className="text-sm text-stone-500">{c.groups.length} groups {openComp === c.id ? "▴" : "▾"}</span>
            </button>
            {openComp === c.id && (
              <div className="space-y-2 border-t border-sand-200 p-3">
                {c.groups.map((g) => <GroupRow key={g.id} g={g} />)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function GroupRow({ g }: { g: Group }) {
  const r = useRouter();
  const booked = g.slots.filter((s) => s.state === "BOOKED").length;
  const pending = g.slots.filter((s) => s.state === "PENDING" || s.state === "HELD").length;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sand-100 p-2">
      <div className="w-44 text-sm">
        <div className="font-semibold">{g.isFinal ? "🏆 FINAL" : g.label} · <span className="tabular">{fmtTime(g.startsAt)}</span></div>
        <div className="text-xs text-stone-500">{fmtDate(g.startsAt)} · {booked} booked{pending ? ` · ${pending} pending` : ""}</div>
      </div>
      <div className="flex flex-1 flex-wrap gap-1">
        {g.slots.map((s) => (
          <button key={s.id} title={s.state === "BLOCKED" ? "Blocked — click to unblock" : s.state === "FREE" ? "Click to block (e.g. broken target)" : s.state}
            onClick={async () => { if (s.state === "FREE" || s.state === "BLOCKED") { await api(`/api/admin/slots/${s.id}/block`, { body: {} }); r.refresh(); } }}
            className={cn("relative h-8 w-8 rounded text-xs font-semibold tabular",
              s.state === "BOOKED" ? "bg-oasis-500 text-white" : s.state === "PENDING" || s.state === "HELD" ? "bg-amber-300" : s.state === "BLOCKED" ? "bg-stone-200 text-stone-400 line-through" : s.isLeftHand ? "border border-sky-400 bg-sky-50" : "border border-sand-300 bg-white")}>
            {s.targetNo}
          </button>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="text-rose-600" onClick={async () => { if (confirm("Delete this group?")) { await api(`/api/admin/groups/${g.id}`, { method: "DELETE" }); r.refresh(); } }}>Delete</Button>
    </div>
  );
}
