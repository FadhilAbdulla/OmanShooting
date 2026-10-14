"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { readCard, parseCard, sampleCard, type CardResult } from "@/lib/idcard";
import { GOVERNORATES } from "@/lib/oman";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";

type Step = "scan" | "details" | "photo";
const STEPS: { key: Step | "verified" | "card"; label: string }[] = [
  { key: "verified", label: "Civil ID verified" },
  { key: "scan", label: "Scan ID card" },
  { key: "details", label: "Your details" },
  { key: "photo", label: "Photo" },
  { key: "card", label: "Membership card" },
];

/** MEM-09: square-crop to 512×512 PNG with a circular mask. */
async function cropCircle(file: Blob): Promise<string> {
  const img = await createImageBitmap(file);
  const size = Math.min(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 512, 512);
  return c.toDataURL("image/png");
}

export function Onboarding({ civilId, verifiedMobile, next, demo }: { civilId: string; verifiedMobile: string | null; next: string; demo: boolean }) {
  const r = useRouter();
  const [step, setStep] = useState<Step>("scan");
  const [front, setFront] = useState<Blob | null>(null);
  const [back, setBack] = useState<Blob | null>(null);
  const [progress, setProgress] = useState<{ p: number; label: string } | null>(null);
  const [result, setResult] = useState<CardResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [f, setF] = useState({ fullName: "", tribe: "", mobile: verifiedMobile ?? "", email: "", gender: "MALE", hand: "RIGHT", dob: "", governorate: "Muscat", wilayat: "", idExpiry: "" });
  const [fromCard, setFromCard] = useState<Set<string>>(new Set());
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bothRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function scan(images: Blob[]) {
    setScanError(null); setResult(null);
    try {
      const text = await readCard(images, (p, label) => setProgress({ p, label }));
      const res = parseCard(text, civilId);
      setProgress(null);
      // MEM-03: reject photos that aren't a readable ID card, or a card that belongs to someone else
      if (!res.looksLikeCard) { setScanError("We couldn't read an ID card in this photo. Place the whole card on a dark surface in good light, avoid glare, and retake."); return; }
      if (res.civilId && !res.civilMatches) { setScanError(`This card's number (${res.civilId}) doesn't match the civil ID you verified (${civilId}). Please scan your own ID card.`); return; }
      setResult(res);
      const filled = new Set<string>();
      setF((cur) => {
        const n = { ...cur };
        if (res.name) { n.fullName = res.name; filled.add("fullName"); }
        if (res.dob) { n.dob = res.dob; filled.add("dob"); }
        if (res.governorate) { n.governorate = res.governorate; filled.add("governorate"); }
        if (res.wilayat) { n.wilayat = res.wilayat; filled.add("wilayat"); }
        if (res.expiry) { n.idExpiry = res.expiry; filled.add("idExpiry"); }
        return n;
      });
      setFromCard(filled);
    } catch {
      setProgress(null);
      setScanError("Card reading isn't available right now — you can enter your details manually.");
    }
  }

  async function useSample() {
    const [a, b] = await sampleCard(civilId);
    setFront(a); setBack(b);
    await scan([a, b]);
  }

  async function submit() {
    setBusy(true);
    try {
      await api("/api/auth/register", { body: { ...f, idExpiry: f.idExpiry || null, photo, idScanned: !!result?.civilMatches } });
      r.push(`/welcome?next=${encodeURIComponent(next)}`);
      r.refresh();
    } catch { setBusy(false); }
  }

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const detailsValid = f.fullName.trim().length >= 3 && (!!verifiedMobile || /^(\+?968)?[79]\d{7}$/.test(f.mobile.replace(/\s/g, ""))) && !!f.dob && !!f.governorate;

  return (
    <div className="mx-auto max-w-2xl py-4">
      {/* Progress */}
      <ol className="mb-6 flex items-center gap-1 text-xs">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 flex-col items-center gap-1 text-center">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
              i < currentIdx ? "border-oasis-500 bg-oasis-500 text-white" : i === currentIdx ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 bg-white text-stone-400")}>
              {i < currentIdx ? "✓" : i + 1}
            </span>
            <span className={cn("hidden sm:block", i === currentIdx ? "font-semibold text-stone-900" : "text-stone-500")}>{s.label}</span>
          </li>
        ))}
      </ol>

      {step === "scan" && (
        <Card className="space-y-5 p-6">
          <div>
            <h1 className="text-xl font-bold">Scan your ID card</h1>
            <p className="text-sm text-stone-600">We read your name, date of birth and card details automatically so you don&apos;t have to type them. Civil ID <b className="tabular">{civilId}</b> is already verified.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["Front of card", front, setFront], ["Back of card", back, setBack]] as const).map(([label, img, setImg]) => (
              <label key={label} className={cn("relative flex aspect-[1.586] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-sm", img ? "border-oasis-500" : "border-sand-300 bg-sand-50 hover:bg-sand-100")}>
                {img ? <BlobImage blob={img} alt={label} /> : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                    <span className="mt-2 font-medium">{label}</span>
                    <span className="text-xs text-stone-500">Take a photo or upload</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setImg(file); setResult(null); setScanError(null); } }} />
              </label>
            ))}
          </div>
          {/* MEM-04: both sides at once */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => bothRef.current?.click()}>Upload both sides at once</button>
            <input ref={bothRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { const fs = [...(e.target.files ?? [])]; if (fs[0]) setFront(fs[0]); if (fs[1]) setBack(fs[1]); setResult(null); setScanError(null); }} />
            {demo && <><span className="text-stone-300">|</span><button type="button" className="font-medium text-amber-700 hover:underline" onClick={useSample} disabled={!!progress}>Demo: use a sample card</button></>}
          </div>

          {progress && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-stone-600"><span>{progress.label}</span><span>{Math.round(progress.p * 100)}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-sand-200"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress.p * 100}%` }} /></div>
            </div>
          )}
          {scanError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{scanError}</div>}
          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="mb-2 font-semibold">✓ Card read — please check these details on the next step</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-emerald-700">Civil number</dt><dd className="tabular">{result.civilId ?? "—"} {result.civilMatches && "✓ matches"}</dd>
                <dt className="text-emerald-700">Name</dt><dd>{result.name ?? "— (enter manually)"}</dd>
                <dt className="text-emerald-700">Date of birth</dt><dd>{result.dob ? fmtDate(result.dob + "T08:00:00Z") : "—"}</dd>
                <dt className="text-emerald-700">Card expiry</dt><dd>{result.expiry ? fmtDate(result.expiry + "T08:00:00Z") : "—"} {result.expired && <b className="text-rose-700">expired</b>}</dd>
                <dt className="text-emerald-700">Governorate</dt><dd>{result.governorate ?? "—"}{result.wilayat ? ` · ${result.wilayat}` : ""}</dd>
              </dl>
            </div>
          )}
          <p className="text-xs text-stone-500">🔒 Your card images are processed on this device and are not uploaded or stored.</p>
          <div className="flex flex-wrap items-center gap-3">
            {!result ? (
              <Button size="lg" disabled={!front || !!progress} onClick={() => scan([front!, ...(back ? [back] : [])])}>{progress ? "Reading…" : "Read my card"}</Button>
            ) : (
              <Button size="lg" onClick={() => setStep("details")}>Continue</Button>
            )}
            <button type="button" className="text-sm text-stone-500 hover:text-stone-800" onClick={() => setStep("details")}>Skip — enter details manually</button>
          </div>
        </Card>
      )}

      {step === "details" && (
        <Card className="space-y-5 p-6">
          <div>
            <h1 className="text-xl font-bold">Your details</h1>
            <p className="text-sm text-stone-600">{fromCard.size ? "We filled in what we could read from your card — check it, then add the rest." : "Fill in your details as they appear on your ID card."}</p>
          </div>
          {result?.expired && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Your ID card expired on {fmtDate(f.idExpiry + "T08:00:00Z")}. You can continue, but the Committee may ask to see a valid card at check-in.</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2" hint={fromCard.has("fullName") ? "From your ID card" : undefined}><input className={inputCls} required value={f.fullName} onChange={set("fullName")} /></Field>
            <Field label="Date of birth" hint={fromCard.has("dob") ? "From your ID card · decides your age category" : "Decides your age category and can't be changed later"}><input type="date" className={inputCls} required value={f.dob} onChange={set("dob")} /></Field>
            <Field label="Tribe (optional)"><input className={inputCls} value={f.tribe} onChange={set("tribe")} /></Field>
            <Field label="Governorate" hint={fromCard.has("governorate") ? "From your ID card" : undefined}><select className={inputCls} value={f.governorate} onChange={set("governorate")}>{GOVERNORATES.map((g) => <option key={g}>{g}</option>)}</select></Field>
            <Field label="Wilayat" hint={fromCard.has("wilayat") ? "From your ID card" : undefined}><input className={inputCls} value={f.wilayat} onChange={set("wilayat")} /></Field>
            <Field label="Mobile number" hint={verifiedMobile ? "✓ Verified with your sign-in code" : "For your booking confirmations and sign-in codes"}><input className={cn(inputCls, verifiedMobile && "bg-sand-100")} required inputMode="tel" placeholder="9XXXXXXX" value={f.mobile} disabled={!!verifiedMobile} onChange={set("mobile")} /></Field>
            <Field label="Email (optional)"><input type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
            <Field label="Gender">
              <div className="flex gap-2">{(["MALE", "FEMALE"] as const).map((g) => <button type="button" key={g} onClick={() => setF({ ...f, gender: g })} className={cn("h-10 flex-1 rounded-lg border text-sm", f.gender === g ? "border-brand-500 bg-brand-50 font-medium" : "border-sand-300")}>{g === "MALE" ? "Male" : "Female"}</button>)}</div>
            </Field>
            <Field label="Dominant (shooting) hand" hint="Left-handed shooters book the targets marked L">
              <div className="flex gap-2">{(["RIGHT", "LEFT"] as const).map((g) => <button type="button" key={g} onClick={() => setF({ ...f, hand: g })} className={cn("h-10 flex-1 rounded-lg border text-sm", f.hand === g ? "border-brand-500 bg-brand-50 font-medium" : "border-sand-300")}>{g === "RIGHT" ? "Right" : "Left"}</button>)}</div>
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" disabled={!detailsValid} onClick={() => setStep("photo")}>Continue</Button>
            <button type="button" className="text-sm text-stone-500 hover:text-stone-800" onClick={() => setStep("scan")}>Back</button>
            {!detailsValid && <span className="text-xs text-stone-500">Name, date of birth and an Omani mobile number are required.</span>}
          </div>
        </Card>
      )}

      {step === "photo" && (
        <Card className="space-y-5 p-6">
          <div>
            <h1 className="text-xl font-bold">Add your photo</h1>
            <p className="text-sm text-stone-600">Your photo appears on your digital membership card and helps the check-in desk recognise you.</p>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-sand-200 bg-sand-100">
              {photo ? <img src={photo} alt="Your photo" className="h-full w-full object-cover" /> : <svg viewBox="0 0 24 24" className="h-16 w-16 text-sand-300" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z" /></svg>}
            </div>
            <div className="space-y-2 text-sm">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-sand-300 bg-white px-4 font-medium hover:bg-sand-100">
                📷 Take a selfie / upload
                <input type="file" accept="image/*" capture="user" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setPhoto(await cropCircle(file)); }} />
              </label>
              <p className="text-xs text-stone-500">Face the camera, plain background, no sunglasses. We crop it to a circle automatically.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" disabled={busy} onClick={submit}>{busy ? "Creating your membership…" : photo ? "Create my membership" : "Skip photo & create membership"}</Button>
            <button type="button" className="text-sm text-stone-500 hover:text-stone-800" onClick={() => setStep("details")}>Back</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function BlobImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" /> : null;
}
