"use client";
import { useEffect, useState } from "react";

export function Countdown({ to, onExpire, className }: { to: string | Date; onExpire?: () => void; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const left = Math.max(0, target - now);
  useEffect(() => {
    if (left === 0) onExpire?.();
  }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return <span className={`tabular ${left < 60000 ? "text-rose-600 font-semibold" : ""} ${className ?? ""}`}>{m}:{String(s).padStart(2, "0")}</span>;
}
