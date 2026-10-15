"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, inputCls } from "@/components/ui";

const SUBJECTS = {
  en: ["Membership", "Championship registration", "Payments & refunds", "Range licensing", "Media enquiry", "Other"],
  ar: ["العضوية", "التسجيل في البطولات", "المدفوعات والاسترداد", "ترخيص الميادين", "استفسار إعلامي", "أخرى"],
};

export function ContactForm({ ar }: { ar: boolean }) {
  const subjects = ar ? SUBJECTS.ar : SUBJECTS.en;
  const [f, setF] = useState({ name: "", mobile: "", email: "", subject: subjects[0], message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (state === "sent") {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
        <h2 className="text-lg font-semibold">{ar ? "تم إرسال رسالتك" : "Message sent"}</h2>
        <p className="mt-1 text-sm text-stone-600">{ar ? "شكراً لتواصلك، سيرد عليك فريق اللجنة في أقرب وقت." : "Thank you — the Committee team will get back to you soon."}</p>
        <button className="mt-4 text-sm font-medium text-brand-600 hover:underline" onClick={() => { setF({ ...f, message: "" }); setState("idle"); }}>{ar ? "إرسال رسالة أخرى" : "Send another message"}</button>
      </div>
    );
  }
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault(); setState("sending");
      try { await api("/api/contact", { body: f }); setState("sent"); } catch { setState("idle"); }
    }}>
      <h2 className="text-lg font-semibold sm:col-span-2">{ar ? "أرسل رسالة" : "Send us a message"}</h2>
      <Field label={ar ? "الاسم" : "Name"} className="sm:col-span-2"><input className={inputCls} required value={f.name} onChange={set("name")} /></Field>
      <Field label={ar ? "رقم الهاتف" : "Mobile"}><input className={inputCls} inputMode="tel" dir="ltr" value={f.mobile} onChange={set("mobile")} placeholder="9XXXXXXX" /></Field>
      <Field label={ar ? "البريد الإلكتروني" : "Email"}><input type="email" className={inputCls} dir="ltr" value={f.email} onChange={set("email")} /></Field>
      <Field label={ar ? "الموضوع" : "Subject"} className="sm:col-span-2"><select className={inputCls} value={f.subject} onChange={set("subject")}>{subjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label={ar ? "الرسالة" : "Message"} className="sm:col-span-2"><textarea className={`${inputCls} h-32 py-2`} required value={f.message} onChange={set("message")} /></Field>
      {/* honeypot — hidden from people, bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={set("website")} />
      <p className="text-xs text-stone-500 sm:col-span-2">{ar ? "أدخل رقم الهاتف أو البريد الإلكتروني لنتمكن من الرد عليك." : "Give us a mobile number or an email so we can reply."}</p>
      <Button size="lg" className="sm:col-span-2" disabled={state === "sending"}>{state === "sending" ? (ar ? "جارٍ الإرسال…" : "Sending…") : (ar ? "إرسال" : "Send message")}</Button>
    </form>
  );
}
