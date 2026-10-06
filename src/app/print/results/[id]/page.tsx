import { requirePageRole, STAFF } from "@/lib/auth";
import { leaderboard } from "@/lib/scoring";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/utils";
import { PrintButton } from "../../print-button";

export const dynamic = "force-dynamic";

/** TOUR-15c/15d: A4 qualification & final results */
export default async function PrintResults({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(STAFF);
  const { id } = await params;
  const { rows, comp, locked } = await leaderboard(id);
  const ev = await prisma.event.findUniqueOrThrow({ where: { id: comp.eventId } });
  const hasFinal = rows.some((r) => r.final != null);
  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-sm">
      <PrintButton />
      <div className="mb-4 border-b-2 border-brand-500 pb-2 text-center">
        <div className="text-xs text-stone-500">Oman Committee for Traditional Shooting · اللجنة العمانية للرماية التقليدية</div>
        <h1 className="text-xl font-bold">{ev.nameEn}</h1>
        <h2 className="text-lg">{comp.nameEn} — {hasFinal ? "Final results" : "Qualification results"}</h2>
        <div className="text-xs text-stone-500">{locked ? "OFFICIAL" : "PROVISIONAL"} · printed {fmtDateTime(new Date())}</div>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-stone-400 text-xs uppercase"><th className="p-1 text-start">Rank</th><th className="p-1 text-start">#</th><th className="p-1 text-start">Name</th><th className="p-1 text-start">Governorate</th><th className="p-1 text-end">Qual</th><th className="p-1 text-end">X</th>{hasFinal && <><th className="p-1 text-end">Final</th><th className="p-1 text-end">Total</th></>}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className={`border-b border-stone-200 ${r.finalist ? "font-semibold" : ""}`}>
              <td className="p-1">{r.rank}</td><td className="p-1">{r.participantNo}</td><td className="p-1">{r.name}</td><td className="p-1">{r.governorate}</td>
              <td className="p-1 text-end">{r.qual}</td><td className="p-1 text-end">{r.qualX || ""}</td>
              {hasFinal && <><td className="p-1 text-end">{r.final ?? ""}</td><td className="p-1 text-end">{r.finalist ? r.combined : ""}</td></>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-16 grid grid-cols-2 gap-16 text-center text-xs"><div className="border-t border-stone-400 pt-1">Chief Judge</div><div className="border-t border-stone-400 pt-1">Committee Representative</div></div>
    </div>
  );
}
