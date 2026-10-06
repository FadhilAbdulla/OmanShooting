import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const GET = handle(async (req: Request) => {
  await requireApiRole(["ADMIN", "JUDGE"]);
  const groupId = new URL(req.url).searchParams.get("groupId")!;
  const g = await prisma.group.findUniqueOrThrow({ where: { id: groupId }, include: { competition: true } });
  const bookings = await prisma.booking.findMany({
    where: { groupId, status: "CONFIRMED" }, include: { user: true }, orderBy: { targetNo: "asc" },
  });
  const c = g.competition;
  return ok({
    group: { id: g.id, label: g.label, startsAt: g.startsAt, isFinal: g.isFinal },
    comp: { id: c.id, name: c.nameEn, seriesCount: c.seriesCount, shotsPerSeries: c.shotsPerSeries, maxScorePerShot: c.maxScorePerShot, locked: !!c.resultsLockedAt, finalistsCount: c.finalistsCount },
    rows: bookings.map((b) => ({ id: b.id, targetNo: b.targetNo, name: b.user.fullName, participantNo: b.participantNo, attendance: b.attendance, series: b.series, xCount: b.xCount, total: b.total })),
  });
});
