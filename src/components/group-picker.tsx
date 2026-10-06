"use client";
import { cn, fmtDate, fmtTime } from "@/lib/utils";
import type { PickerData } from "@/lib/picker";

export function locate(data: PickerData, groupId: string | null) {
  for (const e of data.events) for (const c of e.comps) for (const g of c.groups) if (g.id === groupId) return { e, c, g };
  return null;
}

export function GroupPicker({ data, groupId, onChange }: { data: PickerData; groupId: string | null; onChange: (id: string) => void }) {
  const cur = locate(data, groupId);
  const ev = cur?.e ?? data.events[0];
  const comp = cur?.c ?? ev?.comps[0];
  const dates = [...new Set(comp?.groups.map((g) => g.date) ?? [])];
  const date = cur?.g.date ?? dates[0];
  const sel = "h-10 rounded-lg border border-sand-300 bg-white px-2 text-sm";
  if (!ev) return <p className="text-sm text-stone-500">No events.</p>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={ev.id} onChange={(e) => { const x = data.events.find((v) => v.id === e.target.value); const g = x?.comps[0]?.groups[0]; if (g) onChange(g.id); }}>
          {data.events.map((e) => <option key={e.id} value={e.id}>{e.name}{e.isTest ? " (draft/test)" : ""}</option>)}
        </select>
        <select className={sel} value={comp?.id} onChange={(e) => { const c = ev.comps.find((v) => v.id === e.target.value); const g = c?.groups.find((x) => x.date === date) ?? c?.groups[0]; if (g) onChange(g.id); }}>
          {ev.comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={sel} value={date} onChange={(e) => { const g = comp?.groups.find((x) => x.date === e.target.value); if (g) onChange(g.id); }}>
          {dates.map((d) => <option key={d} value={d}>{fmtDate(d + "T08:00:00Z")}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1">
        {comp?.groups.filter((g) => g.date === date).map((g) => (
          <button key={g.id} onClick={() => onChange(g.id)} className={cn("rounded-lg border px-3 py-1.5 text-sm", g.id === groupId ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 bg-white hover:bg-sand-100")}>
            {g.isFinal ? "🏆 Final" : g.label} <span className="tabular opacity-75">{fmtTime(g.startsAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
