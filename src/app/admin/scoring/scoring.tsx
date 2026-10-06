"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useStream } from "@/components/use-stream";
import { GroupPicker, locate } from "@/components/group-picker";
import { Leaderboard } from "@/components/leaderboard";
import { Button, Card, Empty } from "@/components/ui";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import type { PickerData } from "@/lib/picker";

type Row = { id: string; targetNo: number; name: string; participantNo: number | null; attendance: string; series: number[]; xCount: number | null; total: number | null };
type Sheet = { group: { id: string; label: string; isFinal: boolean }; comp: { id: string; name: string; seriesCount: number; shotsPerSeries: number; maxScorePerShot: number; locked: boolean; finalistsCount: number }; rows: Row[] };

export function Scoring({ data, isAdmin }: { data: PickerData; isAdmin: boolean }) {
  const [groupId, setGroupId] = useState<string | null>(data.defaultGroupId);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [x, setX] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, "saving" | "ok" | "err">>({});
  const cells = useRef<(HTMLInputElement | null)[]>([]);

  const load = useCallback(async () => {
    if (!groupId) return;
    const s = await api<Sheet>(`/api/admin/score-sheet?groupId=${groupId}`, { quiet: true });
    setSheet(s);
    setDraft(Object.fromEntries(s.rows.map((r) => [r.id, [...Array(s.comp.seriesCount)].map((_, i) => (r.series[i] != null ? String(r.series[i]) : ""))])));
    setX(Object.fromEntries(s.rows.map((r) => [r.id, r.xCount != null ? String(r.xCount) : ""])));
  }, [groupId]);
  useEffect(() => { load(); if (groupId) window.history.replaceState(null, "", `?group=${groupId}`); }, [groupId, load]);

  const compId = locate(data, groupId)?.c.id;
  useStream(groupId ? [`group:${groupId}`] : [], load, 400);

  const maxSeries = sheet ? sheet.comp.shotsPerSeries * sheet.comp.maxScorePerShot : 0;

  async function save(r: Row) {
    const vals = (draft[r.id] ?? []);
    // Series must be entered in order: stop at the first empty cell
    const series: number[] = [];
    for (const v of vals) { if (v === "") break; series.push(Number(v)); }
    if (series.some((v) => isNaN(v) || v < 0 || v > maxSeries)) { setSaved((s) => ({ ...s, [r.id]: "err" })); toast(`Series must be 0–${maxSeries}`, "err"); return; }
    if (JSON.stringify(series) === JSON.stringify(r.series) && (x[r.id] || "") === (r.xCount != null ? String(r.xCount) : "")) return;
    setSaved((s) => ({ ...s, [r.id]: "saving" }));
    try {
      await api(`/api/admin/bookings/${r.id}/score`, { body: { series, xCount: x[r.id] ? Number(x[r.id]) : null }, quiet: true });
      setSaved((s) => ({ ...s, [r.id]: "ok" }));
      r.series = series; r.xCount = x[r.id] ? Number(x[r.id]) : null;
    } catch (e) { setSaved((s) => ({ ...s, [r.id]: "err" })); toast((e as Error).message, "err"); }
  }

  // Keyboard flow: Enter / Tab moves to the next cell; auto-advance once a series has as many digits as its max
  const cols = sheet ? sheet.comp.seriesCount + 1 : 1;
  function move(idx: number, dir = 1) { cells.current[idx + dir]?.focus(); cells.current[idx + dir]?.select(); }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Scoring & results</h1>
      <GroupPicker data={data} groupId={groupId} onChange={setGroupId} />
      {sheet && (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <Card className="overflow-x-auto p-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-sand-200 p-3 text-sm">
              <b>{sheet.comp.name} · {sheet.group.isFinal ? "Final" : sheet.group.label}</b>
              <span className="text-stone-500">{sheet.comp.seriesCount} × {sheet.comp.shotsPerSeries} shots · max {maxSeries}/series</span>
              {sheet.comp.locked && <span className="rounded bg-oasis-500 px-2 text-xs text-white">LOCKED</span>}
              <span className="ms-auto text-xs text-stone-500">Type a score, press Enter → next shooter. Saves automatically.</span>
            </div>
            {!sheet.rows.length ? <div className="p-4"><Empty>No confirmed shooters in this group.</Empty></div> : (
              <table className="w-full text-sm">
                <thead className="bg-sand-100/60 text-xs uppercase text-stone-500">
                  <tr><th className="p-2">T</th><th className="p-2 text-start">Shooter</th>{[...Array(sheet.comp.seriesCount)].map((_, i) => <th key={i} className="p-2">S{i + 1}</th>)}<th className="p-2">X</th><th className="p-2 text-end">Total</th><th className="w-6"></th></tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {sheet.rows.map((r, ri) => {
                    const vals = draft[r.id] ?? [];
                    const total = vals.reduce((a, v) => a + (Number(v) || 0), 0);
                    return (
                      <tr key={r.id} className={cn(r.attendance === "ABSENT" && "opacity-40")}>
                        <td className="p-2 text-center font-bold tabular">{r.targetNo}</td>
                        <td className="p-2"><div className="font-medium">{r.name}</div><div className="text-xs text-stone-500">{r.participantNo ? `#${r.participantNo}` : ""} {r.attendance === "PRESENT" ? "· ✓ present" : r.attendance === "ABSENT" ? "· absent" : ""}</div></td>
                        {vals.map((v, si) => {
                          const idx = ri * cols + si;
                          return (
                            <td key={si} className="p-1 text-center">
                              <input ref={(el) => { cells.current[idx] = el; }} disabled={sheet.comp.locked || r.attendance === "ABSENT"} inputMode="numeric" value={v}
                                onChange={(e) => {
                                  const nv = e.target.value.replace(/\D/g, "").slice(0, String(maxSeries).length);
                                  setDraft((d) => ({ ...d, [r.id]: d[r.id].map((o, k) => (k === si ? nv : o)) }));
                                  // Auto-advance to the next series once no further digit could be valid
                                  if (nv && Number(nv) * 10 > maxSeries) setTimeout(() => move(idx, 1), 0);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); save(r); move(idx, cols); } // same series, next shooter
                                  if (e.key === "ArrowDown") { e.preventDefault(); move(idx, cols); }
                                  if (e.key === "ArrowUp") { e.preventDefault(); move(idx, -cols); }
                                }}
                                onBlur={() => save(r)}
                                className="h-11 w-16 rounded-lg border border-sand-300 text-center text-lg font-semibold tabular focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-stone-100" />
                            </td>
                          );
                        })}
                        <td className="p-1 text-center">
                          <input ref={(el) => { cells.current[ri * cols + cols - 1] = el; }} disabled={sheet.comp.locked || r.attendance === "ABSENT"} inputMode="numeric" value={x[r.id] ?? ""}
                            onChange={(e) => setX((o) => ({ ...o, [r.id]: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(r); move(ri * cols + cols - 1, 1); } }}
                            onBlur={() => save(r)} className="h-11 w-12 rounded-lg border border-sand-200 text-center tabular text-stone-600" title="Inner tens (tie-break)" />
                        </td>
                        <td className="p-2 text-end text-lg font-bold tabular">{vals.some((v) => v !== "") ? total : "–"}</td>
                        <td className="text-center text-xs">{saved[r.id] === "saving" ? "…" : saved[r.id] === "ok" ? <span className="text-oasis-600">✓</span> : saved[r.id] === "err" ? <span className="text-rose-600">!</span> : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <div className="space-y-3">
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Leaderboard (live)</h2>
                {compId && <a href={`/api/admin/export?type=results&competitionId=${compId}`} className="text-xs text-brand-600 hover:underline">⬇ Excel</a>}</div>
              {compId && <ResultsActions compId={compId} locked={sheet.comp.locked} finalists={sheet.comp.finalistsCount} isAdmin={isAdmin} onChange={load} />}
              {compId && <Leaderboard competitionId={compId} />}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsActions({ compId, locked, finalists, isAdmin, onChange }: { compId: string; locked: boolean; finalists: number; isAdmin: boolean; onChange: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("16:00");
  return (
    <div className="space-y-2 rounded-lg bg-sand-100 p-3 text-sm">
      {!locked && (
        <div className="flex flex-wrap items-center gap-2">
          <span>Final:</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded border border-sand-300 px-1" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 rounded border border-sand-300 px-1" />
          <Button size="sm" variant="secondary" onClick={async () => {
            if (!confirm(`Create the final group from the top ${finalists} qualifiers and assign targets automatically?`)) return;
            await api(`/api/admin/competitions/${compId}/finals`, { body: { date, time } }); toast("Final group generated"); onChange();
            window.location.reload();
          }}>⚡ Generate final ({finalists})</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {isAdmin && (locked
          ? <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Unlock results for corrections? This is audited.")) { await api(`/api/admin/competitions/${compId}/publish`, { body: { unlock: true } }); onChange(); } }}>Unlock</Button>
          : <Button size="sm" variant="success" onClick={async () => { if (confirm("Publish official results? Scores will be locked.")) { await api(`/api/admin/competitions/${compId}/publish`, { body: {} }); toast("Results published & locked"); onChange(); } }}>Publish official results</Button>)}
        <Button size="sm" variant="ghost" onClick={() => window.open(`/print/results/${compId}`, "_blank")}>🖨 Print A4</Button>
      </div>
    </div>
  );
}
