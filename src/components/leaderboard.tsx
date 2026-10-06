"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStream } from "./use-stream";
import { cn } from "@/lib/utils";

type Row = { rank: number; userId: string; name: string; governorate: string | null; participantNo: number | null; qual: number; qualX: number; series: number[]; final: number | null; combined: number; finalist: boolean };
type Data = { rows: Row[]; teams: { gov: string; total: number; counted: number }[]; locked: boolean; maxScore: number; format: string; seriesCount: number };

export function Leaderboard({ competitionId, tv = false, limit }: { competitionId: string; tv?: boolean; limit?: number }) {
  const [d, setD] = useState<Data | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const prev = useRef<Data | null>(null);
  const load = useCallback(async () => {
    const res = await fetch(`/api/results/${competitionId}`);
    if (!res.ok) return;
    const next: Data = await res.json();
    // Highlight rows whose score changed since the last load
    if (prev.current) {
      const before = new Map(prev.current.rows.map((r) => [r.userId, r.combined]));
      const changed = new Set(next.rows.filter((r) => before.get(r.userId) !== r.combined).map((r) => r.userId));
      if (changed.size) {
        setFlash(changed);
        setTimeout(() => setFlash(new Set()), 2500);
      }
    }
    prev.current = next;
    setD(next);
  }, [competitionId]);
  useEffect(() => { load(); }, [load]);
  useStream([`scores:${competitionId}`], load, 300);
  // TOUR-17: TV mode also refreshes every 30s as a fallback
  useEffect(() => { if (!tv) return; const i = setInterval(load, 30_000); return () => clearInterval(i); }, [tv, load]);

  if (!d) return <div className="p-6 text-stone-500">Loading…</div>;
  if (!d.rows.length) return <div className={cn("p-6 text-center", tv ? "text-sand-200 text-2xl" : "text-stone-500")}>No scores yet</div>;
  const hasFinal = d.rows.some((r) => r.final != null);
  const rows = limit ? d.rows.slice(0, limit) : d.rows;
  return (
    <div className="space-y-4">
      {d.locked && !tv && <div className="text-sm font-medium text-oasis-600">✓ Official results — published and locked</div>}
      <div className="overflow-x-auto">
        <table className={cn("w-full", tv ? "text-2xl" : "text-sm")}>
          <thead className={cn(tv ? "text-sand-300" : "text-stone-500", "text-xs uppercase")}>
            <tr className={tv ? "text-base" : ""}>
              <th className="p-2 text-start">#</th><th className="p-2 text-start">Shooter</th>
              {!tv && d.seriesCount > 1 && [...Array(d.seriesCount)].map((_, i) => <th key={i} className="p-2 text-end">S{i + 1}</th>)}
              <th className="p-2 text-end">Qual</th>{!tv && <th className="p-2 text-end">X</th>}
              {hasFinal && <><th className="p-2 text-end">Final</th><th className="p-2 text-end">Total</th></>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className={cn("border-t transition-colors duration-700", tv ? "border-white/10" : "border-sand-100", flash.has(r.userId) && (tv ? "bg-amber-400/30" : "bg-amber-100"))}>
                <td className="p-2 font-bold tabular">
                  <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full", r.rank === 1 ? "bg-amber-400 text-amber-950" : r.rank === 2 ? "bg-stone-300 text-stone-800" : r.rank === 3 ? "bg-orange-300 text-orange-950" : "", tv && "h-10 w-10")}>{r.rank}</span>
                </td>
                <td className="p-2">
                  <div className="font-medium">{r.name} {r.finalist && <span className="ms-1 rounded bg-brand-500 px-1.5 text-[10px] text-white align-middle">FINAL</span>}</div>
                  {!tv && <div className="text-xs text-stone-500">{r.participantNo ? `#${r.participantNo} · ` : ""}{r.governorate}</div>}
                </td>
                {!tv && d.seriesCount > 1 && [...Array(d.seriesCount)].map((_, i) => <td key={i} className="p-2 text-end tabular text-stone-600">{r.series[i] ?? "–"}</td>)}
                <td className="p-2 text-end font-semibold tabular">{r.qual}</td>
                {!tv && <td className="p-2 text-end tabular text-stone-500">{r.qualX || ""}</td>}
                {hasFinal && <><td className="p-2 text-end tabular">{r.final ?? "–"}</td><td className="p-2 text-end font-bold tabular">{r.finalist ? r.combined : "–"}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!tv && d.teams.length > 1 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{d.format === "TEAM" ? "Team" : "Governorate"} ranking</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {d.teams.slice(0, 6).map((t, i) => (
              <div key={t.gov} className="flex items-center justify-between rounded-lg bg-sand-100 px-3 py-2 text-sm"><span>{i + 1}. {t.gov}</span><span className="font-semibold tabular">{t.total}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
