"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * ID card capture for onboarding (MEM-02/04). MVP: the card is captured — by live camera scan or by
 * uploading photos / a PDF with both sides — and verification is simulated (3 s → "Identity verified").
 * Nothing is read or uploaded; images stay on the device.
 */
type Side = "front" | "back";
type Captured = { front?: string; back?: string; pdfName?: string };

export function IdCapture({ civilId, onVerified }: { civilId: string; onVerified: (ok: boolean) => void }) {
  const [mode, setMode] = useState<"choose" | "camera" | "upload">("choose");
  const [cap, setCap] = useState<Captured>({});
  const [phase, setPhase] = useState<"capturing" | "verifying" | "verified">("capturing");

  const complete = !!cap.pdfName || (!!cap.front && !!cap.back);

  // Simulated verification: 3 seconds after both sides are captured/uploaded
  useEffect(() => {
    if (!complete || phase !== "capturing") return;
    setPhase("verifying");
    const t = setTimeout(() => { setPhase("verified"); onVerified(true); }, 3000);
    return () => clearTimeout(t);
  }, [complete]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setCap({}); setPhase("capturing"); setMode("choose"); onVerified(false);
  }

  if (phase === "verifying" || phase === "verified") {
    return (
      <div className="rounded-2xl border border-sand-200 bg-white p-6 text-center">
        {phase === "verifying" ? (
          <>
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-sand-200 border-t-brand-500" />
            <div className="mt-4 text-lg font-semibold">Verifying identity…</div>
            <p className="text-sm text-stone-500">Checking your ID card against civil ID {civilId}</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
            <div className="mt-3 text-xl font-bold text-emerald-800">Identity verified</div>
            <p className="text-sm text-stone-600">Your ID card matches civil ID <b className="tabular">{civilId}</b>.</p>
          </>
        )}
        <Thumbs cap={cap} />
        {phase === "verified" && <button type="button" onClick={reset} className="mt-4 text-sm text-stone-500 hover:text-stone-800">Retake / use a different file</button>}
      </div>
    );
  }

  if (mode === "camera") return <CameraScan cap={cap} setCap={setCap} onCancel={() => setMode("choose")} onFallback={() => setMode("upload")} />;
  if (mode === "upload") return <UploadCard cap={cap} setCap={setCap} onBack={() => setMode("choose")} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => setMode("camera")} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-brand-500 bg-brand-50 p-6 text-center transition hover:bg-brand-100">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-2xl text-white">📷</span>
        <span className="text-base font-semibold">Scan with camera</span>
        <span className="text-xs text-stone-600">Hold your card inside the frame — front, then back</span>
      </button>
      <button type="button" onClick={() => setMode("upload")} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-sand-300 bg-white p-6 text-center transition hover:bg-sand-50">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand-100 text-2xl">⬆</span>
        <span className="text-base font-semibold">Upload</span>
        <span className="text-xs text-stone-600">Photos of both sides, or one PDF with both sides</span>
      </button>
    </div>
  );
}

function Thumbs({ cap }: { cap: Captured }) {
  if (cap.pdfName) return <div className="mx-auto mt-4 flex max-w-xs items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3 text-start text-sm"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">PDF</span><span className="min-w-0 flex-1 truncate">{cap.pdfName}<span className="block text-xs text-stone-500">Both sides</span></span><span className="text-emerald-600">✓</span></div>;
  return (
    <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
      {(["front", "back"] as Side[]).map((s) => cap[s] && (
        <figure key={s} className="relative overflow-hidden rounded-lg border border-sand-200">
          <img src={cap[s]} alt={`${s} of card`} className="aspect-[1.586] w-full object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[11px] text-white">{s === "front" ? "Front" : "Back"} ✓</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Live camera with a card-shaped guide frame. Captures the area inside the frame. */
function CameraScan({ cap, setCap, onCancel, onFallback }: { cap: Captured; setCap: (c: Captured) => void; onCancel: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [justCaptured, setJustCaptured] = useState<Side | null>(null);
  const side: Side = cap.front ? "back" : "front";

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) { setError("This browser can't open the camera here."); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      })
      .catch(() => setError("Camera access was blocked or isn't available."));
    return () => { cancelled = true; stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = useCallback(() => {
    const v = video.current, fr = frame.current;
    if (!v || !fr || !v.videoWidth) return;
    // Map the on-screen guide frame back onto the video's pixels (video is object-cover)
    const vb = v.getBoundingClientRect(), fb = fr.getBoundingClientRect();
    const scale = Math.max(vb.width / v.videoWidth, vb.height / v.videoHeight);
    const offX = (v.videoWidth * scale - vb.width) / 2, offY = (v.videoHeight * scale - vb.height) / 2;
    const sx = (fb.left - vb.left + offX) / scale, sy = (fb.top - vb.top + offY) / scale;
    const sw = fb.width / scale, sh = fb.height / scale;
    const c = document.createElement("canvas");
    c.width = 1012; c.height = 638;
    c.getContext("2d")!.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.85);
    setFlash(true); setTimeout(() => setFlash(false), 180);
    setJustCaptured(side); setTimeout(() => setJustCaptured(null), 1400);
    const next = { ...cap, [side]: url };
    setCap(next);
    if (next.front && next.back) stream.current?.getTracks().forEach((t) => t.stop());
  }, [cap, setCap, side]);

  async function nativePhoto(file: File) {
    const url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
    setCap({ ...cap, [side]: url });
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-sand-200 bg-white p-5 text-center">
        <p className="text-sm text-stone-700">{error}</p>
        <p className="text-xs text-stone-500">Allow camera access in your browser settings, or use your phone&apos;s camera app instead.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => nativeRef.current?.click()}>📷 Open camera app — {side === "front" ? "front" : "back"}</Button>
          <Button type="button" variant="secondary" onClick={onFallback}>⬆ Upload instead</Button>
        </div>
        <input ref={nativeRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) nativePhoto(f); e.target.value = ""; }} />
        <Thumbs cap={cap} />
      </div>
    );
  }

  return (
    // Phones: full-screen camera above everything (like a native scanner). Larger screens: inline.
    <div className="fixed inset-0 z-[60] flex flex-col bg-black sm:static sm:z-auto sm:overflow-hidden sm:rounded-2xl">
      <div className="relative w-full flex-1 sm:aspect-video sm:flex-none">
        <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {/* Guide frame: everything outside is dimmed */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div ref={frame} className="relative aspect-[1.586] w-[86%] max-w-md rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
            {["start-0 top-0 border-s-4 border-t-4 rounded-ss-xl", "end-0 top-0 border-e-4 border-t-4 rounded-se-xl", "start-0 bottom-0 border-s-4 border-b-4 rounded-es-xl", "end-0 bottom-0 border-e-4 border-b-4 rounded-ee-xl"].map((c) => (
              <span key={c} className={cn("absolute h-8 w-8 border-white", c)} />
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 text-center text-white">
          <div className="text-xs uppercase tracking-widest text-white/70">Step {side === "front" ? 1 : 2} of 2</div>
          <div className="text-base font-semibold">Place the {side === "front" ? "FRONT" : "BACK"} of your ID card inside the frame</div>
        </div>
        {justCaptured && <div className="absolute inset-x-0 top-24 mx-auto w-fit rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">✓ {justCaptured === "front" ? "Front" : "Back"} captured</div>}
        {flash && <div className="absolute inset-0 bg-white/80" />}
      </div>
      <div className="flex items-center justify-between gap-3 bg-black px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={onCancel} className="text-sm text-white/80">Cancel</button>
        <button type="button" onClick={capture} aria-label="Capture" className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 active:scale-95"><span className="h-11 w-11 rounded-full bg-white" /></button>
        <div className="flex gap-1">
          {(["front", "back"] as Side[]).map((s) => <span key={s} className={cn("h-10 w-14 overflow-hidden rounded border", cap[s] ? "border-emerald-400" : "border-white/30")}>{cap[s] && <img src={cap[s]} alt="" className="h-full w-full object-cover" />}</span>)}
        </div>
      </div>
    </div>
  );
}

/** Upload photos of both sides, or a single PDF containing both sides. */
function UploadCard({ cap, setCap, onBack }: { cap: Captured; setCap: (c: Captured) => void; onBack: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handle(files: File[]) {
    setNote(null);
    const pdf = files.find((f) => f.type === "application/pdf");
    if (pdf) { setCap({ pdfName: pdf.name }); return; }
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) { setNote("Please choose a photo (JPG, PNG) or a PDF."); return; }
    const urls = await Promise.all(images.slice(0, 2).map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); })));
    const next = { ...cap, pdfName: undefined } as Captured;
    for (const u of urls) { if (!next.front) next.front = u; else next.back = u; }
    setCap(next);
    if (!next.back) setNote("Front uploaded — now add the back of the card.");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-sand-200 bg-white p-5">
      <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 p-8 text-center hover:bg-sand-100">
        <span className="text-3xl">⬆</span>
        <span className="font-semibold">{cap.front && !cap.back ? "Upload the back of your card" : "Upload your ID card"}</span>
        <span className="text-xs text-stone-500">JPG or PNG photos of both sides, or one PDF with both sides</span>
      </button>
      <input ref={input} type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => { handle([...(e.target.files ?? [])]); e.target.value = ""; }} />
      {note && <p className="text-sm text-amber-800">{note}</p>}
      <Thumbs cap={cap} />
      <button type="button" onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800">← Back</button>
    </div>
  );
}
