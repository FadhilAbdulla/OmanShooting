"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

/** Photo grid with a full-screen viewer (tap to open, arrows/swipe-friendly buttons, Esc to close). */
export function GalleryGrid({ items }: { items: { src: string; caption: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i! + 1) % items.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i! - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length]);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((g, i) => (
          <button key={g.src} onClick={() => setOpen(i)} className={`group relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
            <Image src={g.src} alt={g.caption} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-start text-xs text-white opacity-0 transition group-hover:opacity-100">{g.caption}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-4 text-sm text-white/80"><span>{open + 1} / {items.length}</span><button aria-label="Close" className="text-2xl">✕</button></div>
          <div className="relative flex-1"><Image src={items[open].src} alt={items[open].caption} fill sizes="100vw" className="object-contain" /></div>
          <div className="flex items-center justify-between gap-4 p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <button className="rounded-full bg-white/10 px-4 py-2" onClick={() => setOpen((open - 1 + items.length) % items.length)}>‹</button>
            <span className="text-center text-sm">{items[open].caption}</span>
            <button className="rounded-full bg-white/10 px-4 py-2" onClick={() => setOpen((open + 1) % items.length)}>›</button>
          </div>
        </div>
      )}
    </>
  );
}
