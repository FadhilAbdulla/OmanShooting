/**
 * MEM-08: complete digital shooter profile — personal data, photograph, participation history,
 * achievements and certificates. Everything is derived from bookings, scores and published results,
 * so it stays correct as championships are scored.
 */
import { prisma } from "./db";
import { leaderboard } from "./scoring";

export type HistoryRow = {
  bookingId: string;
  eventName: string; eventSlug: string; season: number;
  competition: string; competitionId: string;
  date: Date; group: string; targetNo: number; isFinal: boolean;
  series: number[]; total: number | null; xCount: number | null; maxScore: number; seriesMax: number;
  rank: number | null; field: number | null; finalist: boolean; official: boolean;
  attendance: string;
};

export type Achievement = { key: string; icon: string; title: string; detail: string; date?: Date; tier: "gold" | "silver" | "bronze" | "badge" };
export type Certificate = { id: string; kind: "achievement" | "participation"; title: string; competition: string; event: string; date: Date; rank: number | null; score: number | null };

const MEDAL = { 1: ["gold", "🥇", "1st place"], 2: ["silver", "🥈", "2nd place"], 3: ["bronze", "🥉", "3rd place"] } as const;

export async function shooterProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
  if (!user) return null;
  const bookings = await prisma.booking.findMany({
    where: { userId, status: "CONFIRMED", isTest: false },
    include: { group: true, competition: { include: { event: true } } },
    orderBy: { group: { startsAt: "desc" } },
  });

  // Rank per competition from the live leaderboard (best attempt counts, finals combined)
  const compIds = [...new Set(bookings.filter((b) => b.total != null).map((b) => b.competitionId))];
  const boards = new Map<string, Awaited<ReturnType<typeof leaderboard>>>();
  for (const id of compIds) boards.set(id, await leaderboard(id));

  const history: HistoryRow[] = bookings.map((b) => {
    const lb = boards.get(b.competitionId);
    const row = lb?.rows.find((r) => r.userId === userId);
    const c = b.competition;
    return {
      bookingId: b.id, eventName: c.event.nameEn, eventSlug: c.event.slug, season: c.event.season,
      competition: c.nameEn, competitionId: c.id, date: b.group.startsAt, group: b.group.label, targetNo: b.targetNo, isFinal: b.group.isFinal,
      series: b.series, total: b.total, xCount: b.xCount, maxScore: c.shotsPerSeries * c.seriesCount * c.maxScorePerShot, seriesMax: c.shotsPerSeries * c.maxScorePerShot,
      rank: b.total != null ? row?.rank ?? null : null, field: lb?.rows.length ?? null, finalist: !!row?.finalist,
      official: !!c.resultsLockedAt, attendance: b.attendance,
    };
  });

  const scored = history.filter((h) => h.total != null && !h.isFinal);
  const best = scored.reduce<HistoryRow | null>((a, h) => (!a || h.total! > a.total! ? h : a), null);
  const avg = scored.length ? scored.reduce((a, h) => a + h.total!, 0) / scored.length : null;
  // One result per competition (the best attempt) for medals/certificates
  const perComp = new Map<string, HistoryRow>();
  for (const h of scored) { const cur = perComp.get(h.competitionId); if (!cur || h.total! > cur.total!) perComp.set(h.competitionId, h); }
  const results = [...perComp.values()];
  const podiums = results.filter((r) => r.rank != null && r.rank <= 3);
  const finals = new Set(history.filter((h) => h.finalist || h.isFinal).map((h) => h.competitionId)).size;
  const championships = new Set(history.map((h) => h.eventSlug)).size;

  const achievements: Achievement[] = [];
  for (const r of podiums.sort((a, b) => a.rank! - b.rank!)) {
    const [tier, icon, label] = MEDAL[r.rank as 1 | 2 | 3];
    achievements.push({ key: `podium-${r.competitionId}`, icon, tier, title: `${label} — ${r.competition}`, detail: `${r.eventName} · ${r.total} pts${r.official ? "" : " (provisional)"}`, date: r.date });
  }
  for (const r of results.filter((x) => x.finalist && (x.rank ?? 99) > 3)) {
    achievements.push({ key: `final-${r.competitionId}`, icon: "🎯", tier: "badge", title: `Finalist — ${r.competition}`, detail: r.eventName, date: r.date });
  }
  if (best) achievements.push({ key: "pb", icon: "⭐", tier: "badge", title: `Personal best: ${best.total} / ${best.maxScore}`, detail: `${best.competition} · ${best.eventName}`, date: best.date });
  const perfect = scored.find((h) => h.series.some((s) => s === h.seriesMax)); // a full series with every shot at maximum
  if (perfect) achievements.push({ key: "perfect", icon: "💯", tier: "badge", title: "Perfect series", detail: `${perfect.competition} · ${perfect.eventName}`, date: perfect.date });
  if (championships >= 1) achievements.push({ key: "first", icon: "🏁", tier: "badge", title: "First championship", detail: history[history.length - 1]?.eventName ?? "", date: history[history.length - 1]?.date });
  if (scored.length >= 5) achievements.push({ key: "five", icon: "🔥", tier: "badge", title: "5 competitions shot", detail: "Regular on the firing line" });

  const certificates: Certificate[] = results.map((r) => ({
    id: r.bookingId,
    kind: r.rank != null && r.rank <= 3 ? "achievement" : "participation",
    title: r.rank != null && r.rank <= 3 ? `Certificate of Achievement — ${MEDAL[r.rank as 1 | 2 | 3][2]}` : "Certificate of Participation",
    competition: r.competition, event: r.eventName, date: r.date, rank: r.rank, score: r.total,
  }));

  return {
    user,
    stats: { championships, competitions: results.length, attempts: scored.length, best: best?.total ?? null, bestOf: best?.maxScore ?? null, avg, finals, podiums: podiums.length, upcoming: history.filter((h) => h.date.getTime() > Date.now()).length },
    history,
    achievements,
    certificates,
  };
}

/** Certificate data for the printable page (anyone with the link can view it, for verification). */
export async function certificate(bookingId: string) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { user: true, group: true, competition: { include: { event: true } } } });
  if (!b || b.status !== "CONFIRMED" || b.total == null || b.isTest) return null;
  const lb = await leaderboard(b.competitionId);
  const row = lb.rows.find((r) => r.userId === b.userId);
  const rank = row?.rank ?? null;
  return { b, rank, field: lb.rows.length, official: !!b.competition.resultsLockedAt, achievement: rank != null && rank <= 3 };
}
