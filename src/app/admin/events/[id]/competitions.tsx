"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Badge, Button, Card, Empty, Field, inputCls } from "@/components/ui";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Comp = {
  id: string; parentId: string | null; nameEn: string; nameAr: string; firearm: string; genderRule: "MALE" | "FEMALE" | "ANY";
  minAge: number | null; maxAge: number | null; format: "INDIVIDUAL" | "TEAM"; teamSize: number | null; shotsPerSeries: number;
  seriesCount: number; maxScorePerShot: number; venueType: "INDOOR_AC" | "INDOOR" | "OUTDOOR"; targetsPerGroup: number;
  leftHandTargets: number[]; enforceHand: boolean; prices: number[]; maxParticipants: number | null; finalistsCount: number;
  _count: { groups: number; bookings: number };
};

const PRESETS = [
  ["individual-10", "Individual · 10 shots"],
  ["individual-7", "Individual · 7 shots"],
  ["series-3x10", "3 series × 10"],
  ["team-3", "Team · 3 shooters"],
] as const;
const BANDS = [["U18", "Under 18"], ["18-39", "18–39"], ["40+", "40+"], ["OPEN", "Open age"]] as const;
const G = { MALE: "Men", FEMALE: "Women", ANY: "Open" };
const V = { INDOOR_AC: "Indoor A/C", INDOOR: "Indoor", OUTDOOR: "Outdoor" };

export function Competitions({ eventId, comps }: { eventId: string; comps: Comp[] }) {
  const r = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [matrixFor, setMatrixFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const roots = comps.filter((c) => !c.parentId);
  const kids = (id: string) => comps.filter((c) => c.parentId === id);

  async function create(body: object) {
    setBusy(true);
    try { const res = await api<{ id: string }>("/api/admin/competitions", { body: { eventId, ...body } }); r.refresh(); setEditing(res.id); toast("Competition added"); } catch {}
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <span className="me-2 text-sm font-medium">Quick add:</span>
        {PRESETS.map(([k, l]) => <Button key={k} size="sm" variant="secondary" disabled={busy} onClick={() => create({ preset: k })}>+ {l}</Button>)}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => create({ data: { nameEn: "New competition", nameAr: "مسابقة جديدة", prices: [5] } })}>+ Custom</Button>
      </Card>
      {!roots.length && <Empty>No competitions yet. Use a quick-add preset above — then generate age/gender sub-competitions in one click.</Empty>}
      {roots.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <Row c={c} childCount={kids(c.id).length} onEdit={() => setEditing(editing === c.id ? null : c.id)} isRoot
            onSub={() => create({ parentId: c.id })} onMatrix={() => setMatrixFor(matrixFor === c.id ? null : c.id)} />
          {matrixFor === c.id && <Matrix id={c.id} onDone={() => { setMatrixFor(null); r.refresh(); }} />}
          {editing === c.id && <EditForm c={c} hasChildren={kids(c.id).length > 0} onDone={() => { setEditing(null); r.refresh(); }} />}
          {kids(c.id).length > 0 && (
            <div className="border-t border-sand-200 bg-sand-50/60">
              {kids(c.id).map((k) => (
                <div key={k.id} className="border-b border-sand-100 last:border-0">
                  <Row c={k} onEdit={() => setEditing(editing === k.id ? null : k.id)} />
                  {editing === k.id && <EditForm c={k} hasChildren={false} onDone={() => { setEditing(null); r.refresh(); }} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Row({ c, onEdit, onSub, onMatrix, isRoot, childCount = 0 }: { c: Comp; onEdit: () => void; onSub?: () => void; onMatrix?: () => void; isRoot?: boolean; childCount?: number }) {
  const r = useRouter();
  const age = c.minAge != null && c.maxAge != null ? `${c.minAge}–${c.maxAge}` : c.minAge != null ? `${c.minAge}+` : c.maxAge != null ? `≤${c.maxAge}` : "All ages";
  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !isRoot && "ps-10")}>
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium", isRoot && "text-base")}>{!isRoot && "↳ "}{c.nameEn} <span className="text-sm font-normal text-stone-500">{c.nameAr}</span></div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge className="bg-sand-100 text-sand-700">{G[c.genderRule]}</Badge>
          <Badge className="bg-sand-100 text-sand-700">{age}</Badge>
          <Badge className="bg-sand-100 text-sand-700">{c.format === "TEAM" ? `Team of ${c.teamSize}` : "Individual"}</Badge>
          <Badge className="bg-sand-100 text-sand-700">{c.seriesCount > 1 ? `${c.seriesCount}×` : ""}{c.shotsPerSeries} shots</Badge>
          <Badge className="bg-sand-100 text-sand-700">{c.targetsPerGroup} targets · {V[c.venueType]}</Badge>
          <Badge className="bg-sand-100 text-sand-700">{c.prices.map((p) => p.toFixed(3)).join(" / ")} OMR</Badge>
          {childCount > 0
            ? <Badge className="bg-sky-100 text-sky-800">{childCount} sub-competitions · groups are scheduled per sub-competition</Badge>
            : <Badge className={c._count.groups ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}>{c._count.groups ? `${c._count.groups} groups` : "No groups yet — open Schedule"}</Badge>}
          {c._count.bookings > 0 && <Badge className="bg-sky-100 text-sky-800">{c._count.bookings} bookings</Badge>}
        </div>
      </div>
      <div className="flex gap-1">
        {onMatrix && <Button size="sm" variant="secondary" onClick={onMatrix} title="Create one sub-competition per gender × age band">⚡ Age/gender split</Button>}
        {onSub && <Button size="sm" variant="ghost" onClick={onSub}>+ Sub</Button>}
        <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-rose-600" onClick={async () => { if (confirm(`Delete "${c.nameEn}"${isRoot ? " and its sub-competitions" : ""}?`)) { await api(`/api/admin/competitions/${c.id}`, { method: "DELETE" }); r.refresh(); } }}>✕</Button>
      </div>
    </div>
  );
}

function Matrix({ id, onDone }: { id: string; onDone: () => void }) {
  const [genders, setGenders] = useState<string[]>(["MALE", "FEMALE"]);
  const [bands, setBands] = useState<string[]>(["U18", "18-39", "40+"]);
  const toggle = (arr: string[], v: string, set: (x: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <div className="flex flex-wrap items-end gap-4 border-t border-sand-200 bg-amber-50/50 px-4 py-3">
      <div>
        <div className="mb-1 text-xs font-medium text-stone-600">Genders</div>
        <div className="flex gap-1">{(["MALE", "FEMALE"] as const).map((g) => <Chip key={g} on={genders.includes(g)} onClick={() => toggle(genders, g, setGenders)}>{G[g]}</Chip>)}</div>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-stone-600">Age bands</div>
        <div className="flex gap-1">{BANDS.map(([k, l]) => <Chip key={k} on={bands.includes(k)} onClick={() => toggle(bands, k, setBands)}>{l}</Chip>)}</div>
      </div>
      <Button size="sm" disabled={!genders.length || !bands.length} onClick={async () => {
        const res = await api<{ created: number }>(`/api/admin/competitions/${id}/matrix`, { body: { genders, bands } });
        toast(`${res.created} sub-competition(s) created — settings inherited from parent`);
        onDone();
      }}>Create {genders.length * bands.length} sub-competitions</Button>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 bg-white")}>{children}</button>;
}

function EditForm({ c, hasChildren, onDone }: { c: Comp; hasChildren: boolean; onDone: () => void }) {
  const [f, setF] = useState({ ...c, pricesText: c.prices.join(", ") });
  const [applyChildren, setApplyChildren] = useState(hasChildren);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? null : Number(e.target.value)) as never);
  const toggleLeft = (t: number) => set("leftHandTargets", f.leftHandTargets.includes(t) ? f.leftHandTargets.filter((x) => x !== t) : [...f.leftHandTargets, t].sort((a, b) => a - b));

  return (
    <form className="space-y-4 border-t border-sand-200 bg-white p-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        const prices = f.pricesText.split(/[,\s/]+/).filter(Boolean).map(Number);
        const { pricesText: _p, _count: _c, id: _i, parentId: _pa, ...rest } = f; void _p; void _c; void _i; void _pa;
        await api(`/api/admin/competitions/${c.id}`, { method: "PATCH", body: { ...rest, prices, applyToChildren: applyChildren } });
        toast("Saved"); onDone();
      } catch {}
      setBusy(false);
    }}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name (English)" className="sm:col-span-2"><input className={inputCls} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></Field>
        <Field label="Name (Arabic)" className="sm:col-span-2"><input dir="rtl" className={inputCls} value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} /></Field>
        <Field label="Gender">
          <select className={inputCls} value={f.genderRule} onChange={(e) => set("genderRule", e.target.value as Comp["genderRule"])}><option value="ANY">Open (all)</option><option value="MALE">Men</option><option value="FEMALE">Women</option></select>
        </Field>
        <Field label="Min age"><input type="number" className={inputCls} value={f.minAge ?? ""} onChange={num("minAge")} placeholder="—" /></Field>
        <Field label="Max age"><input type="number" className={inputCls} value={f.maxAge ?? ""} onChange={num("maxAge")} placeholder="—" /></Field>
        <Field label="Firearm"><input className={inputCls} value={f.firearm} onChange={(e) => set("firearm", e.target.value)} /></Field>
        <Field label="Format">
          <select className={inputCls} value={f.format} onChange={(e) => set("format", e.target.value as Comp["format"])}><option value="INDIVIDUAL">Individual</option><option value="TEAM">Team / group</option></select>
        </Field>
        {f.format === "TEAM" && <Field label="Team size"><input type="number" className={inputCls} value={f.teamSize ?? 3} onChange={num("teamSize")} /></Field>}
        <Field label="Shots per series" hint="e.g. 7 or 10">
          <div className="flex gap-1">
            {[7, 10].map((n) => <button key={n} type="button" onClick={() => set("shotsPerSeries", n)} className={cn("h-10 w-12 rounded-lg border text-sm", f.shotsPerSeries === n ? "border-brand-500 bg-brand-50 font-semibold" : "border-sand-300")}>{n}</button>)}
            <input type="number" className={inputCls} value={f.shotsPerSeries} onChange={num("shotsPerSeries")} />
          </div>
        </Field>
        <Field label="Series"><input type="number" className={inputCls} value={f.seriesCount} onChange={num("seriesCount")} /></Field>
        <Field label="Max points / shot"><input type="number" className={inputCls} value={f.maxScorePerShot} onChange={num("maxScorePerShot")} /></Field>
        <Field label="Venue">
          <select className={inputCls} value={f.venueType} onChange={(e) => set("venueType", e.target.value as Comp["venueType"])}><option value="OUTDOOR">Outdoor</option><option value="INDOOR_AC">Indoor · air-conditioned</option><option value="INDOOR">Indoor · no A/C</option></select>
        </Field>
        <Field label="Shooters per group (targets)"><input type="number" className={inputCls} value={f.targetsPerGroup} onChange={num("targetsPerGroup")} /></Field>
        <Field label="Price by attempt (OMR)" hint="1st, 2nd, … attempt — count = max attempts"><input className={inputCls} value={f.pricesText} onChange={(e) => set("pricesText", e.target.value)} placeholder="5, 3" /></Field>
        <Field label="Max participants (total)" hint="Blank = limited only by targets"><input type="number" className={inputCls} value={f.maxParticipants ?? ""} onChange={num("maxParticipants")} /></Field>
        <Field label="Finalists"><input type="number" className={inputCls} value={f.finalistsCount} onChange={num("finalistsCount")} /></Field>
      </div>
      <div>
        <div className="mb-1 text-sm font-medium">Left-hand targets <span className="font-normal text-stone-500">— tap to toggle</span></div>
        <div className="flex flex-wrap gap-1">
          {[...Array(f.targetsPerGroup || 0)].map((_, i) => (
            <button type="button" key={i} onClick={() => toggleLeft(i + 1)} className={cn("h-9 w-9 rounded-md border text-sm tabular", f.leftHandTargets.includes(i + 1) ? "border-sky-500 bg-sky-500 text-white" : "border-sand-300 bg-white")}>{i + 1}</button>
          ))}
          <button type="button" className="ms-2 text-xs text-brand-600" onClick={() => set("leftHandTargets", [1, f.targetsPerGroup].filter((x, i, a) => a.indexOf(x) === i))}>Ends only</button>
          <button type="button" className="ms-2 text-xs text-stone-500" onClick={() => set("leftHandTargets", [])}>None</button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enforceHand} onChange={(e) => set("enforceHand", e.target.checked)} /> Enforce dominant hand when booking</label>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={busy}>Save</Button>
        {hasChildren && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={applyChildren} onChange={(e) => setApplyChildren(e.target.checked)} /> Also apply format, shots, targets, venue & prices to all sub-competitions</label>}
        <Button type="button" variant="ghost" onClick={onDone}>Close</Button>
      </div>
    </form>
  );
}
