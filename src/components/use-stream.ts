"use client";
import { useEffect, useRef } from "react";

/** Subscribe to server-sent events on one or more channels. Callback is debounced to coalesce bursts. */
export function useStream(channels: string[], onMessage: (m: { ch: string; [k: string]: unknown }) => void, debounceMs = 150) {
  const cb = useRef(onMessage);
  cb.current = onMessage;
  const key = channels.filter(Boolean).sort().join("|");
  useEffect(() => {
    if (!key) return;
    const qs = key.split("|").map((c) => `ch=${encodeURIComponent(c)}`).join("&");
    const es = new EventSource(`/api/stream?${qs}`);
    let t: ReturnType<typeof setTimeout> | null = null;
    let last: { ch: string } | null = null;
    es.onmessage = (e) => {
      try { last = JSON.parse(e.data); } catch { return; }
      if (t) clearTimeout(t);
      t = setTimeout(() => last && cb.current(last as never), debounceMs);
    };
    return () => { es.close(); if (t) clearTimeout(t); };
  }, [key, debounceMs]);
}
