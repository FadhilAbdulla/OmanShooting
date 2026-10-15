import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { certificate } from "@/lib/profile";
import { Logo } from "@/components/logo";
import { fmtDate } from "@/lib/utils";
import { PrintButton } from "../../print/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate · Oman Traditional Shooting" };

const PLACE: Record<number, string> = { 1: "First place", 2: "Second place", 3: "Third place" };

/** Printable A4 certificate. Public by link so a third party can verify it (the QR points back here). */
export default async function Certificate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await certificate(id);
  if (!c) notFound();
  const { b, rank, field, official, achievement } = c;
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/certificates/${b.id}`;
  const qr = await QRCode.toDataURL(url, { margin: 0, width: 160, color: { dark: "#4a0611" } });
  const no = `OTS-${b.competition.event.season}-${b.id.slice(-6).toUpperCase()}`;
  return (
    <div className="min-h-screen bg-stone-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4 landscape; margin: 0; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[297mm] justify-end px-4 no-print"><PrintButton /></div>
      <article className="relative mx-auto aspect-[297/210] w-full max-w-[297mm] overflow-hidden bg-[#fbf8f2] p-[4%] shadow-xl print:shadow-none">
        <div className="absolute inset-[2.5%] rounded border-[3px] border-[#a80d26]" />
        <div className="absolute inset-[3.5%] rounded border border-[#d6c19b]" />
        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <header className="flex flex-col items-center gap-2">
            <Logo className="h-14 w-14" />
            <div className="text-sm tracking-wide text-stone-600">Oman Committee for Traditional Shooting with Traditional Weapons<br /><span className="font-[serif]">اللجنة العُمانية للرماية بالأسلحة التقليدية</span></div>
          </header>
          <div>
            <div className="text-[clamp(1.4rem,4vw,2.6rem)] font-bold uppercase tracking-[0.2em] text-[#870b1f]">{achievement ? "Certificate of Achievement" : "Certificate of Participation"}</div>
            <div className="mt-2 text-sm text-stone-500">This certificate is proudly presented to</div>
            <div className="mt-2 text-[clamp(1.6rem,5vw,3.2rem)] font-bold text-stone-900" style={{ fontFamily: "Georgia, serif" }}>{b.user.fullName}</div>
            <div className="mx-auto mt-3 max-w-2xl text-[clamp(0.85rem,1.6vw,1.05rem)] text-stone-700">
              {achievement ? <>for achieving <b>{PLACE[rank!]}</b> in </> : <>for participating in </>}
              <b>{b.competition.nameEn}</b> at the <b>{b.competition.event.nameEn}</b>, {b.competition.event.location}, with a score of <b>{b.total}</b>{rank ? <> (ranked {rank} of {field})</> : null}.
            </div>
          </div>
          <footer className="flex w-full items-end justify-between gap-4 text-xs text-stone-600">
            <div className="text-start">
              <div className="mb-1 h-px w-40 bg-stone-400" />
              Head of Administrative and Financial Affairs
              <div className="mt-2">Date: {fmtDate(b.group.startsAt)}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              {achievement && <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#c8102e] text-2xl text-white ring-4 ring-[#d6c19b]">★</div>}
              <div className="font-mono">{no}</div>
              {!official && <div className="text-amber-700">Provisional — results not yet published</div>}
            </div>
            <div className="flex flex-col items-end gap-1 text-end">
              <img src={qr} alt="Verify certificate" className="h-20 w-20" />
              Scan to verify
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
