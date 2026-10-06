import { prisma } from "./db";
import { AppError } from "./utils";
import { channels, publish } from "./realtime";
import { audit } from "./audit";

export type Row = {
  rank: number;
  userId: string;
  name: string;
  governorate: string | null;
  participantNo: number | null;
  qual: number;
  qualX: number;
  series: number[];
  final: number | null;
  combined: number;
  finalist: boolean;
};

/** Higher score wins; ties broken by inner tens (X), then by the last series, then the one before… (TOUR-13) */
function cmp(a: { score: number; x: number; series: number[] }, b: { score: number; x: number; series: number[] }) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.x !== a.x) return b.x - a.x;
  for (let i = Math.max(a.series.length, b.series.length) - 1; i >= 0; i--) {
    const d = (b.series[i] ?? 0) - (a.series[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export async function leaderboard(competitionId: string, includeTest = false) {
  const comp = await prisma.competition.findUniqueOrThrow({ where: { id: competitionId } });
  const bookings = await prisma.booking.findMany({
    where: { competitionId, status: "CONFIRMED", total: { not: null }, ...(includeTest ? {} : { isTest: false }) },
    include: { user: true, group: true },
  });

  // Best qualification attempt per shooter (re-entries allowed by tiered pricing)
  const best = new Map<string, (typeof bookings)[number]>();
  const finals = new Map<string, (typeof bookings)[number]>();
  for (const b of bookings) {
    if (b.group.isFinal) { finals.set(b.userId, b); continue; }
    const cur = best.get(b.userId);
    if (!cur || cmp({ score: b.total!, x: b.xCount ?? 0, series: b.series }, { score: cur.total!, x: cur.xCount ?? 0, series: cur.series }) < 0) {
      best.set(b.userId, b);
    }
  }
  const hasFinal = finals.size > 0;
  const rows: Row[] = [...best.values()].map((b) => {
    const f = finals.get(b.userId);
    return {
      rank: 0, userId: b.userId, name: b.user.fullName, governorate: b.user.governorate, participantNo: b.participantNo,
      qual: b.total!, qualX: b.xCount ?? 0, series: b.series, final: f?.total ?? null,
      combined: b.total! + (f?.total ?? 0), finalist: !!f,
    };
  });

  // TOUR-15d: finalists ranked first by combined score, then everyone else by qualification
  rows.sort((a, b) => {
    if (hasFinal && a.finalist !== b.finalist) return a.finalist ? -1 : 1;
    if (hasFinal && a.finalist) {
      return cmp({ score: a.combined, x: a.final ?? 0, series: [] }, { score: b.combined, x: b.final ?? 0, series: [] }) || cmp({ score: a.qual, x: a.qualX, series: a.series }, { score: b.qual, x: b.qualX, series: b.series });
    }
    return cmp({ score: a.qual, x: a.qualX, series: a.series }, { score: b.qual, x: b.qualX, series: b.series });
  });
  rows.forEach((r, i) => (r.rank = i + 1));

  // Team / governorate ranking: sum of best N shooters per governorate (RANK-02 groundwork)
  const n = comp.format === "TEAM" ? comp.teamSize ?? 3 : 3;
  const byGov = new Map<string, number[]>();
  for (const r of rows) {
    const k = r.governorate || "—";
    byGov.set(k, [...(byGov.get(k) ?? []), r.qual]);
  }
  const teams = [...byGov.entries()]
    .map(([gov, s]) => ({ gov, total: s.sort((a, b) => b - a).slice(0, n).reduce((a, v) => a + v, 0), counted: Math.min(n, s.length) }))
    .sort((a, b) => b.total - a.total);

  return { comp, rows, teams, locked: !!comp.resultsLockedAt, maxScore: comp.shotsPerSeries * comp.seriesCount * comp.maxScorePerShot };
}

export async function saveScore(bookingId: string, series: number[], xCount: number | null, actorId: string) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { competition: true } });
  if (!b) throw new AppError("Booking not found", 404);
  if (b.status !== "CONFIRMED") throw new AppError("Only confirmed bookings can be scored", 409);
  if (b.competition.resultsLockedAt) throw new AppError("Results are published and locked", 423, "LOCKED");
  const c = b.competition;
  const maxSeries = c.shotsPerSeries * c.maxScorePerShot;
  if (series.length > c.seriesCount) throw new AppError(`This competition has ${c.seriesCount} series`);
  for (const s of series) if (!Number.isInteger(s) || s < 0 || s > maxSeries) throw new AppError(`Each series must be 0–${maxSeries}`);
  const total = series.length ? series.reduce((a, v) => a + v, 0) : null;
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      series, total, xCount, scoredAt: new Date(),
      // Automation: entering a score implies the shooter is present
      ...(total != null && b.attendance !== "PRESENT" ? { attendance: "PRESENT", checkedInAt: new Date(), checkedInBy: actorId } : {}),
    },
  });
  await publish(channels.scores(b.competitionId));
}

/** TOUR-12: auto-create the final group from the top qualifiers and allocate targets (left-handers to L targets). */
export async function generateFinals(competitionId: string, startsAt: Date, actorId: string) {
  const { comp, rows } = await leaderboard(competitionId, true);
  if (comp.resultsLockedAt) throw new AppError("Results already published", 409);
  const existing = await prisma.group.findFirst({ where: { competitionId, isFinal: true }, include: { bookings: { where: { total: { not: null } } } } });
  if (existing?.bookings.length) throw new AppError("The final already has scores — cannot regenerate", 409);
  const top = rows.slice(0, comp.finalistsCount);
  if (!top.length) throw new AppError("No qualification scores yet", 409);
  const users = await prisma.user.findMany({ where: { id: { in: top.map((t) => t.userId) } } });
  const hand = new Map(users.map((u) => [u.id, u.hand]));
  const isTest = (await prisma.event.findUniqueOrThrow({ where: { id: comp.eventId } })).status === "DRAFT";

  const targets = Math.max(comp.targetsPerGroup, top.length);
  const leftSet = new Set(comp.leftHandTargets);
  const leftTargets = [...Array(targets)].map((_, i) => i + 1).filter((t) => leftSet.has(t));
  const rightTargets = [...Array(targets)].map((_, i) => i + 1).filter((t) => !leftSet.has(t));

  await prisma.$transaction(async (tx) => {
    if (existing) await tx.group.delete({ where: { id: existing.id } });
    const g = await tx.group.create({
      data: { competitionId, label: "FINAL", date: startsAt, startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000), isFinal: true },
    });
    for (let t = 1; t <= targets; t++) {
      await tx.slot.create({ data: { groupId: g.id, targetNo: t, isLeftHand: leftSet.has(t) } });
    }
    for (const r of top) {
      const pool = hand.get(r.userId) === "LEFT" && leftTargets.length ? leftTargets : rightTargets.length ? rightTargets : leftTargets;
      const targetNo = pool.shift()!;
      const slot = await tx.slot.update({ where: { groupId_targetNo: { groupId: g.id, targetNo } }, data: { state: "BOOKED", userId: r.userId } });
      await tx.booking.create({
        data: {
          userId: r.userId, slotId: slot.id, groupId: g.id, competitionId, targetNo, price: 0, status: "CONFIRMED",
          participantNo: r.participantNo, isTest,
        },
      });
    }
    await audit(actorId, "finals.generate", "Competition", competitionId, { finalists: top.length }, undefined, tx);
  });
  await publish(channels.scores(competitionId));
}

/** TOUR-15: publishing locks the leaderboard. */
export async function publishResults(competitionId: string, actorId: string, unlock = false) {
  await prisma.competition.update({ where: { id: competitionId }, data: { resultsLockedAt: unlock ? null : new Date() } });
  await audit(actorId, unlock ? "results.unlock" : "results.publish", "Competition", competitionId);
  await publish(channels.scores(competitionId));
}
