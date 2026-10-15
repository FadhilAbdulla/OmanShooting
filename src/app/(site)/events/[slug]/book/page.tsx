import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, hasRole } from "@/lib/auth";
import { getDict, pick } from "@/lib/i18n";
import { checkEligibility } from "@/lib/eligibility";
import { VenueBadge } from "@/components/venue";
import { BookingBoard } from "./board";
import { isoDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string; move?: string }> }) {
  const { slug } = await params;
  const { c, move } = await searchParams;
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(`/events/${slug}/book?c=${c ?? ""}`)}`);
  const { locale, t } = await getDict();
  const comp = await prisma.competition.findFirst({
    where: { id: c, event: { slug } },
    include: {
      event: true,
      groups: {
        where: { isFinal: false, startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" },
        include: { _count: { select: { slots: { where: { state: { not: "BLOCKED" } } } } } },
      },
    },
  });
  if (!comp) notFound();
  if (comp.event.status === "DRAFT" && !hasRole(s, ["ADMIN"])) notFound();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.uid } });
  const elig = checkEligibility(user, comp, comp.event.startDate);
  // Change mode (TOUR-15e): move an existing booking instead of adding a new one
  const moving = move
    ? await prisma.booking.findFirst({ where: { id: move, userId: s.uid, competitionId: comp.id, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } }, include: { group: true } })
    : null;

  return (
    <div className="space-y-4">
      {comp.event.status === "DRAFT" && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Test mode</b> — bookings here are test data.</div>}
      <div>
        <p className="text-sm text-stone-500">{pick(comp.event, locale)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{pick(comp, locale)}</h1>
          <VenueBadge type={comp.venueType} />
        </div>
        <p className="text-sm text-stone-600">{comp.firearm} · {comp.seriesCount > 1 ? `${comp.seriesCount} × ` : ""}{comp.shotsPerSeries} shots · {comp.targetsPerGroup} targets per group · You shoot <b>{user.hand === "LEFT" ? "left-handed" : "right-handed"}</b></p>
      </div>
      {!elig.ok ? (
        <div className="rounded-lg bg-rose-50 p-4 text-rose-800">{elig.reason}</div>
      ) : (
        <BookingBoard
          competitionId={comp.id}
          enforceHand={comp.enforceHand}
          userHand={user.hand}
          labels={{ free: t.free, held: t.held, booked: t.booked, left: t.left, mine: t.mine, remaining: t.remaining }}
          locale={locale}
          groups={comp.groups.map((g) => ({ id: g.id, label: g.label, date: isoDate(g.date), startsAt: g.startsAt.toISOString(), endsAt: g.endsAt.toISOString(), targets: g._count.slots }))}
          leftTargets={comp.leftHandTargets.filter((n) => n <= comp.targetsPerGroup).length}
          venueType={comp.venueType}
          moving={moving ? { id: moving.id, targetNo: moving.targetNo, groupId: moving.groupId, label: moving.group.label, startsAt: moving.group.startsAt.toISOString() } : null}
        />
      )}
    </div>
  );
}
