"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { IdCapture } from "./id-capture";
import { GOVERNORATES } from "@/lib/oman";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  const [idVerified, setIdVerified] = useState(false);
  const [f, setF] = useState({ fullName: "", tribe: "", mobile: verifiedMobile ?? "", email: "", gender: "MALE", hand: "RIGHT", dob: "", governorate: "Muscat", wilayat: "", idExpiry: "" });
  const fromCard = new Set<string>(); // MVP: the card is captured, not read, so nothing is pre-filled
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  function fillDemoDetails() {
    setF((current) => ({
      ...current,
      fullName: "Khalid Al-Rashdi",
      tribe: "Al-Rashdi",
      mobile: verifiedMobile ?? "91234567",
      email: "demo.shooter@example.com",
      gender: "MALE",
      hand: "RIGHT",
      dob: "1995-05-14",
      governorate: "Muscat",
      wilayat: "Bawshar",
      idExpiry: "2030-12-31",
    }));
  }

  async function cancelSignup() {
    setBusy(true);
    try {
      await api("/api/auth/cancel-registration", { method: "POST" });
      r.push("/");
      r.refresh();
    } catch { setBusy(false); }
  }

  async function submit() {
    setBusy(true);
    try {
      await api("/api/auth/register", { body: { ...f, idExpiry: f.idExpiry || null, photo, idScanned: idVerified } });
      r.push(`/welcome?next=${encodeURIComponent(next)}`);
      r.refresh();
    } catch { setBusy(false); }
  }

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const detailsValid = f.fullName.trim().length >= 3 && (!!verifiedMobile || /^(\+?968)?[79]\d{7}$/.test(f.mobile.replace(/\s/g, ""))) && !!f.dob && !!f.governorate;

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-2 flex justify-end">
        <button type="button" disabled={busy} onClick={cancelSignup} className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline disabled:opacity-50">
          Cancel signup
        </button>
      </div>
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
            <h1 className="text-xl font-bold">Verify your ID card</h1>
            <p className="text-sm text-stone-600">Scan your civil ID card with your phone camera, or upload photos / a PDF of both sides. Civil ID <b className="tabular">{civilId}</b> is already verified by code.</p>
          </div>
          <IdCapture civilId={civilId} onVerified={setIdVerified} />
          <p className="text-xs text-stone-500">🔒 Card images stay on this device and are not stored.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={!idVerified} onClick={() => setStep("details")}>Continue</Button>
            <button type="button" className="text-sm text-stone-500 hover:text-stone-800" onClick={() => setStep("details")}>Skip for now</button>
          </div>
        </Card>
      )}

      {step === "details" && (
        <Card className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Your details</h1>
              <p className="text-sm text-stone-600">{fromCard.size ? "We filled in what we could read from your card — check it, then add the rest." : "Fill in your details as they appear on your ID card."}</p>
            </div>
            {demo && <Button type="button" size="sm" variant="secondary" onClick={fillDemoDetails}>Fill demo details</Button>}
          </div>
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
