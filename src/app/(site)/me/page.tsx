import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge, Card, LinkButton } from "@/components/ui";
import { MemberCard } from "@/components/member-card";
import { checkEligibility, ageLabel } from "@/lib/eligibility";
import { genderLabel } from "@/lib/events";
import { fmtDate, fmtDateTime, fmtTime, isoDate, omr } from "@/lib/utils";
import { ProfileForm, CancelButton } from "./client";

export const dynamic = "force-dynamic";

/** The shooter's home after sign-in: bookings first, then what they can book next. */
export default async function MyBookings({ searchParams }: { searchParams: Promise<{ moved?: string }> }) {
  const { moved } = await searchParams;
  const s = await getSession();
  if (!s) redirect("/login?next=/me");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: s.uid },
    include: { bookings: { where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } }, include: { group: true, competition: { include: { event: true } }, order: true }, orderBy: { group: { startsAt: "asc" } } } },
  });
  const now = Date.now();
  const upcoming = user.bookings.filter((b) => b.group.endsAt.getTime() > now);
  const history = user.bookings.filter((b) => b.group.endsAt.getTime() <= now).reverse();
  const unpaid = upcoming.filter((b) => b.status === "PENDING_PAYMENT" && b.order?.status !== "PENDING_REVIEW");
  const nextUp = upcoming.find((b) => b.status === "CONFIRMED") ?? upcoming[0];

  // Cancellation / change policy (BOOK-08, TOUR-15e) — mirrors the server-side checks
  const selfCancels = await prisma.booking.groupBy({ by: ["competitionId"], where: { userId: s.uid, selfCancelled: true }, _count: true });
  const cancelsByEvent = new Map<string, number>();
  for (const c of selfCancels) {
    const ev = user.bookings.find((b) => b.competitionId === c.competitionId)?.competition.eventId;
    if (ev) cancelsByEvent.set(ev, (cancelsByEvent.get(ev) ?? 0) + c._count);
  }
  const policy = (b: (typeof user.bookings)[number]) => {
    const ev = b.competition.event;
    const hoursLeft = (b.group.startsAt.getTime() - now) / 3_600_000;
    if (b.group.isFinal) return { change: false, cancel: false, note: "Final — allocated by the judges" };
    if (b.total != null) return { change: false, cancel: false, note: "Score recorded" };
    if (hoursLeft < ev.cancelHours) return { change: false, cancel: false, note: `Changes closed ${ev.cancelHours}h before start` };
    const cancelsLeft = ev.maxCancellations - (cancelsByEvent.get(ev.id) ?? 0);
    return { change: true, cancel: cancelsLeft > 0, note: cancelsLeft > 0 ? `Free changes until ${fmtDateTime(new Date(b.group.startsAt.getTime() - ev.cancelHours * 3_600_000))}` : "Cancellation limit reached — you can still change" };
  };

  // Competitions this shooter can book right now
  const openEvents = await prisma.event.findMany({
    where: { status: "PUBLISHED", regOpensAt: { lte: new Date() }, regClosesAt: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    include: {
      competitions: {
        where: { children: { none: {} } }, orderBy: { sortOrder: "asc" },
        include: { groups: { where: { isFinal: false, startsAt: { gt: new Date() } }, select: { _count: { select: { slots: { where: { state: "FREE" } } } } } } },
      },
    },
  });
  const bookable = openEvents.flatMap((e) =>
    e.competitions
      .filter((c) => checkEligibility(user, c, e.startDate).ok)
      .map((c) => ({ e, c, free: c.groups.reduce((a, g) => a + g._count.slots, 0) }))
      .filter((x) => x.free > 0),
  );
  const firstName = user.fullName.split(" ")[0];
  const hoursToNext = nextUp ? (nextUp.group.startsAt.getTime() - now) / 3_600_000 : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">Welcome back, {firstName}</p>
            <h1 className="text-2xl font-bold">My bookings</h1>
          </div>
          <LinkButton href="/#championships">+ Book a target</LinkButton>
        </div>

        {moved && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">✓ Your booking was changed. The new target is shown below.</div>}

        {/* Next up */}
        {nextUp && (
          <div className="heritage-bg flex flex-wrap items-center gap-5 rounded-2xl p-5 text-white">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-brand-700">
              <span className="text-[10px] font-semibold uppercase tracking-wide">Target</span>
              <span className="text-4xl font-black leading-none tabular">{nextUp.targetNo}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-sand-300">Next up {hoursToNext != null && hoursToNext < 48 ? `· in ${hoursToNext < 1 ? "under an hour" : `${Math.round(hoursToNext)} hours`}` : ""}</div>
              <div className="mt-1 text-xl font-bold">{nextUp.competition.nameEn}</div>
              <div className="text-sm text-sand-200">{fmtDate(nextUp.group.startsAt)} · {fmtTime(nextUp.group.startsAt)} · Group {nextUp.group.label}{nextUp.participantNo ? ` · Participant #${nextUp.participantNo}` : ""}</div>
              <div className="text-sm text-sand-300">{nextUp.competition.event.location}</div>
            </div>
            <div className="text-sm text-sand-200">Arrive 30 min early and<br />show your QR at check-in</div>
          </div>
        )}

        {/* Action needed */}
        {unpaid.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <b>Payment needed for {unpaid.length} booking{unpaid.length > 1 ? "s" : ""}.</b> Unpaid bookings are released automatically at the deadline.{" "}
            {unpaid[0].orderId && <Link href={`/orders/${unpaid[0].orderId}`} className="font-semibold underline">See how to pay</Link>}
          </div>
        )}

        {/* Upcoming */}
        <section>
          <h2 className="mb-2 text-lg font-semibold">Upcoming ({upcoming.length})</h2>
          {!upcoming.length && (
            <Card className="p-6 text-center text-sm text-stone-600">You have no upcoming bookings yet. Pick a championship below to book your first target.</Card>
          )}
          <div className="space-y-2">
            {upcoming.map((b) => {
              const pol = policy(b);
              return (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">{b.targetNo}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{b.competition.nameEn}</div>
                      <div className="text-sm text-stone-600">{fmtDateTime(b.group.startsAt)} · Group {b.group.label} · Target {b.targetNo}</div>
                      <div className="text-xs text-stone-500">{b.competition.event.nameEn}{b.participantNo ? ` · Participant #${b.participantNo}` : ""}{b.attemptNo > 1 ? ` · Attempt #${b.attemptNo}` : ""}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {b.status === "PENDING_PAYMENT"
                        ? <Badge className="bg-amber-100 text-amber-800">{b.order?.status === "PENDING_REVIEW" ? "Under review" : b.order?.method === "CASH" ? "Pay at reception" : "Unpaid"}</Badge>
                        : <Badge className="bg-emerald-100 text-emerald-800">Confirmed</Badge>}
                      {b.isTest && <Badge className="bg-stone-200">test</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-sand-100 pt-3 text-sm">
                    {b.orderId && <Link href={`/orders/${b.orderId}`} className="font-medium text-brand-600 hover:underline">{b.status === "PENDING_PAYMENT" ? "Payment details" : "Order details"}</Link>}
                    {pol.change && <Link href={`/events/${b.competition.event.slug}/book?c=${b.competitionId}&move=${b.id}`} className="font-medium text-brand-600 hover:underline">Change target / time</Link>}
                    {pol.cancel && <CancelButton id={b.id} />}
                    <span className="ms-auto text-xs text-stone-500">{pol.note}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* What they can book next */}
        <section>
          <h2 className="mb-2 text-lg font-semibold">Open for you to book</h2>
          {!bookable.length ? (
            <p className="text-sm text-stone-500">No competitions you&apos;re eligible for are open right now.</p>
          ) : (
            <Card className="divide-y divide-sand-100">
              {bookable.slice(0, 8).map(({ e, c, free }) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.nameEn}</div>
                    <div className="text-xs text-stone-500">{e.nameEn} · {genderLabel[c.genderRule]} · {ageLabel(c)} · from {omr(c.prices[0] ?? 0)}</div>
                  </div>
                  <span className="text-sm text-stone-600 tabular">{free} places left</span>
                  <LinkButton href={`/events/${e.slug}/book?c=${c.id}`} size="sm">Book</LinkButton>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* History */}
        <section>
          <h2 className="mb-2 text-lg font-semibold">Participation history</h2>
          {!history.length && <p className="text-sm text-stone-500">Your results will appear here after you compete.</p>}
          <div className="space-y-2">
            {history.map((b) => (
              <Card key={b.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="flex-1"><div className="font-medium">{b.competition.nameEn}</div><div className="text-stone-500">{fmtDateTime(b.group.startsAt)} · {b.competition.event.nameEn}</div></div>
                <div className="text-end"><div className="text-xs text-stone-500">Score</div><div className="text-lg font-bold tabular">{b.total ?? (b.attendance === "ABSENT" ? "Absent" : "–")}</div></div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <MemberCard user={user} />
        <details className="group rounded-xl border border-sand-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold">
            Profile & settings <span className="text-stone-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-sand-100 p-4">
            <ProfileForm user={{ fullName: user.fullName, tribe: user.tribe ?? "", mobile: user.mobile, email: user.email ?? "", gender: user.gender, hand: user.hand, dob: user.dob ? isoDate(user.dob) : "", dobLocked: !!user.dob, governorate: user.governorate ?? "", wilayat: user.wilayat ?? "", photo: user.photo, civilId: user.civilId }} />
          </div>
        </details>
      </aside>
    </div>
  );
}
