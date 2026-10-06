"use client";
import { useEffect, useState } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { Logo } from "@/components/logo";

/** Big-screen display: rotates through competitions every 20s; each board updates live. */
export function TvRotator({ event, comps }: { event: { nameEn: string; nameAr: string }; comps: { id: string; name: string; nameAr: string }[] }) {
  const [i, setI] = useState(0);
  const [clock, setClock] = useState("");
  useEffect(() => {
    const r = setInterval(() => setI((x) => (x + 1) % Math.max(1, comps.length)), 20_000);
    const c = setInterval(() => setClock(new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Muscat", hour: "2-digit", minute: "2-digit" })), 1000);
    return () => { clearInterval(r); clearInterval(c); };
  }, [comps.length]);
  const c = comps[i];
  return (
    <div className="heritage-bg min-h-screen p-8 text-sand-50">
      <div className="mb-6 flex items-center gap-4">
        <Logo className="h-16 w-16" />
        <div className="flex-1">
          <div className="text-xl text-sand-300">{event.nameEn} · {event.nameAr}</div>
          <div className="text-4xl font-bold">{c?.name} <span className="text-sand-300">{c?.nameAr}</span></div>
        </div>
        <div className="text-5xl font-bold tabular">{clock}</div>
      </div>
      {c && <div className="rounded-2xl bg-black/25 p-6"><Leaderboard key={c.id} competitionId={c.id} tv limit={12} /></div>}
      <div className="mt-4 flex justify-center gap-2">{comps.map((x, j) => <span key={x.id} className={`h-2 w-8 rounded-full ${j === i ? "bg-brand-500" : "bg-white/20"}`} />)}</div>
    </div>
  );
}
