"use client";
import { useEffect, useState } from "react";

type T = { id: number; msg: string; kind: "ok" | "err" | "info" };
const listeners = new Set<(t: T) => void>();
let n = 0;

export function toast(msg: string, kind: T["kind"] = "ok") {
  const t = { id: ++n, msg, kind };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const l = (t: T) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 4500);
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-4 no-print md:bottom-4 md:top-auto">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto w-full max-w-md rounded-lg px-4 py-2.5 text-sm shadow-lg ${t.kind === "err" ? "bg-rose-700 text-white" : t.kind === "info" ? "bg-stone-800 text-white" : "bg-oasis-600 text-white"}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
