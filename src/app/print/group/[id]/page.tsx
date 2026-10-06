import { requirePageRole, STAFF } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/utils";
import { PrintButton } from "../../print-button";

export const dynamic = "force-dynamic";

/** TOUR-16: A4 target cards — one card per shooter, 6 per page, with cut lines. */
export default async function PrintGroup({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(STAFF);
  const g = await prisma.group.findUniqueOrThrow({
    where: { id: (await params).id },
    include: { competition: { include: { event: true } }, bookings: { where: { status: "CONFIRMED" }, include: { user: true }, orderBy: { targetNo: "asc" } } },
  });
  return (
    <div className="mx-auto max-w-[210mm] bg-white p-[8mm]">
      <PrintButton />
      <div className="grid grid-cols-2 gap-0">
        {g.bookings.map((b) => (
          <div key={b.id} className="flex h-[93mm] flex-col items-center justify-center border border-dashed border-stone-400 p-4 text-center" style={{ breakInside: "avoid" }}>
            <div className="text-xs text-stone-500">{g.competition.event.nameEn}</div>
            <div className="text-sm font-medium">{g.competition.nameEn}</div>
            <div className="my-2 text-[64px] font-black leading-none">{b.targetNo}</div>
            <div className="text-lg font-bold">{b.user.fullName}</div>
            <div className="text-sm">Participant #{b.participantNo} · {b.user.hand === "LEFT" ? "Left-handed" : ""}</div>
            <div className="mt-1 text-xs text-stone-500">{g.label} · {fmtDateTime(g.startsAt)}</div>
            <div className="mt-3 grid w-full grid-cols-5 gap-1 text-[10px] text-stone-400">{[...Array(g.competition.seriesCount * 1)].map((_, i) => <div key={i} className="h-8 border border-stone-300">S{i + 1}</div>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
