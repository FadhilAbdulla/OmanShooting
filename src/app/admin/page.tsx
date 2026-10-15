import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession, STAFF } from "@/lib/auth";
import { Badge, Card, LinkButton } from "@/components/ui";
import { Icon } from "@/components/bottom-nav";
import { VENUE, VenueLegend } from "@/components/venue";
import { badgeStyle, eventBadge } from "@/lib/events";
import { cn, fmtDate, fmtTime, muscatDateTime, omr } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { DRAFT: "Draft", COMING_SOON: "Coming soon", OPEN: "Registration open", CLOSED: "Closed" } as const;

function Progress({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "oasis" }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={cn("h-full rounded-full", tone === "brand" ? "bg-brand-500" : "bg-oasis-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Kpi({ icon, label, value, sub, href }: { icon: string; label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string }) {
  const body = (
    <Card className={cn("h-full p-4 sm:p-5", href && "transition hover:border-brand-200 hover:shadow-md")}>
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600"><Icon name={icon} className="h-4 w-4" /></span>
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 tabular sm:text-3xl">{value}</div>
      {sub && <div className="mt-2 text-xs text-stone-500">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function Dashboard() {
  const s = await getSession();
  const roles = s?.roles ?? [];
  const can = (r: string[]) => r.some((x) => roles.includes(x));

  // "Today" in Muscat time, whatever the server's timezone
  const muscatNow = new Date(Date.now() + 4 * 3_600_000);
  const startOfDay = muscatDateTime(muscatNow.toISOString().slice(0, 10), "00:00");
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const today = { startsAt: { gte: startOfDay, lt: endOfDay } };

  const [members, confirmed, revenue, pending, drafts, events, todayGroups, expected, present] = await Promise.all([
    prisma.user.count({ where: { roles: { some: { role: "SHOOTER" }, none: { role: { in: STAFF as never[] } } } } }),
    prisma.booking.count({ where: { status: "CONFIRMED", isTest: false } }),
    prisma.order.aggregate({ where: { status: "PAID", isTest: false }, _sum: { total: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING_CASH", "PENDING_REVIEW"] } } }),
    prisma.event.count({ where: { status: "DRAFT" } }),
    prisma.event.findMany({ orderBy: { startDate: "asc" }, where: { status: { not: "CLOSED" } }, take: 5, include: { _count: { select: { competitions: true } } } }),
    prisma.group.findMany({
      where: today, orderBy: [{ startsAt: "asc" }, { label: "asc" }],
      include: {
        competition: { select: { nameEn: true, targetsPerGroup: true, venueType: true } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
    }),
    prisma.booking.count({ where: { status: "CONFIRMED", group: today } }),
    prisma.booking.count({ where: { status: "CONFIRMED", attendance: "PRESENT", group: today } }),
  ]);

  // Fill rate per event: booked targets out of all qualification targets
  const fill = await Promise.all(events.map(async (e) => {
    const where = { group: { isFinal: false, competition: { eventId: e.id } } };
    const [total, taken] = await Promise.all([
      prisma.slot.count({ where }),
      prisma.slot.count({ where: { ...where, state: { in: ["BOOKED", "PENDING"] } } }),
    ]);
    return { total, taken };
  }));

  // Today's schedule grouped by start time, so twenty groups read as four waves
  const waves = new Map<string, typeof todayGroups>();
  for (const g of todayGroups) {
    const key = fmtTime(g.startsAt);
    waves.set(key, [...(waves.get(key) ?? []), g]);
  }

  const hour = muscatNow.getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = s?.name.split(/\s+/)[0] ?? "";

  const attention = [
    can(["ADMIN", "RECEPTION"]) && pending > 0 && { icon: "card", text: `${pending} payment${pending === 1 ? "" : "s"} waiting for review`, href: "/admin/payments", cta: "Review" },
    can(["ADMIN"]) && drafts > 0 && { icon: "calendar", text: `${drafts} draft event${drafts === 1 ? "" : "s"} not yet published`, href: "/admin/events", cta: "Open" },
  ].filter(Boolean) as { icon: string; text: string; href: string; cta: string }[];

  return (
    <div className="space-y-6">
      {/* Header + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{fmtDate(new Date())} · Muscat</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{greeting}{firstName && `, ${firstName}`}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/checkin" size="md"><Icon name="check" className="h-4 w-4" />Open check-in</LinkButton>
          {can(["ADMIN", "JUDGE"]) && <LinkButton href="/admin/scoring" variant="secondary"><Icon name="star" className="h-4 w-4" />Enter scores</LinkButton>}
          {can(["ADMIN"]) && <LinkButton href="/admin/events/new" variant="secondary"><Icon name="plus" className="h-4 w-4" />New event</LinkButton>}
        </div>
      </div>

      {/* Needs attention */}
      {attention.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {attention.map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Icon name={a.icon} className="h-4 w-4" /></span>
              <span className="flex-1 font-medium">{a.text}</span>
              <span className="inline-flex items-center gap-1 font-semibold">{a.cta}<Icon name="arrow" className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon name="check" className="h-5 w-5" />All clear — nothing needs your attention right now.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon="check" label="Checked in today" value={<>{present}<span className="text-base font-normal text-stone-400"> / {expected}</span></>}
          sub={<Progress value={present} max={expected} tone="oasis" />} href="/admin/checkin" />
        <Kpi icon="ticket" label="Confirmed entries" value={confirmed} sub="Across all championships" />
        <Kpi icon="users" label="Registered shooters" value={members} href={can(["ADMIN"]) ? "/admin/users" : undefined} sub="Active memberships" />
        {can(["ADMIN", "RECEPTION"])
          ? <Kpi icon="card" label="Revenue collected" value={omr(revenue._sum.total)} href="/admin/payments" sub={pending ? `${pending} pending review` : "Nothing pending"} />
          : <Kpi icon="clock" label="Groups today" value={todayGroups.length} sub={`${waves.size} start times`} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's schedule */}
        <Card className="order-2 lg:order-1 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-stone-900">Today&apos;s schedule</h2>
              <p className="text-xs text-stone-500">{todayGroups.length} groups · {expected} shooters expected</p>
            </div>
            <VenueLegend className="hidden xl:flex" types={[...new Set(todayGroups.map((g) => g.competition.venueType))]} />
            <Link href="/admin/checkin" className="text-sm font-medium text-brand-600 hover:text-brand-700">Check-in →</Link>
          </div>
          {!todayGroups.length ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-stone-500">
              <Icon name="calendar" className="h-8 w-8 text-stone-300" />No groups are scheduled for today.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {[...waves].map(([time, groups]) => {
                const booked = groups.reduce((n, g) => n + g._count.bookings, 0);
                return (
                  <div key={time} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:gap-5">
                    <div className="flex shrink-0 items-baseline gap-2 sm:w-24 sm:flex-col sm:gap-0.5">
                      <span className="text-lg font-semibold text-stone-900 tabular">{time}</span>
                      <span className="text-xs text-stone-500">{groups.length} groups · {booked} booked</span>
                    </div>
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      {groups.map((g) => (
                        <Link key={g.id} href={`/admin/checkin?group=${g.id}`}
                          className={cn("relative flex items-center gap-2 overflow-hidden rounded-lg border border-s-4 border-stone-200 px-3 py-2 text-sm transition hover:border-brand-200 hover:bg-brand-50/40", VENUE[g.competition.venueType].accent)}
                          title={VENUE[g.competition.venueType].label}>
                          <span className="min-w-0 flex-1 truncate font-medium text-stone-800" title={g.competition.nameEn}>{g.competition.nameEn}</span>
                          <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">{g.label}</span>
                          <span className="w-10 shrink-0 text-end text-xs text-stone-500 tabular">{g._count.bookings}/{g.competition.targetsPerGroup}</span>
                          {/* Fill rate as a hairline along the bottom edge */}
                          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-500" style={{ width: `${Math.min(100, (g._count.bookings / (g.competition.targetsPerGroup || 1)) * 100)}%` }} />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Events */}
        <Card className="order-1 self-start lg:order-2">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-900">Active events</h2>
            {can(["ADMIN"]) && <Link href="/admin/events" className="text-sm font-medium text-brand-600 hover:text-brand-700">All events →</Link>}
          </div>
          {!events.length ? (
            <p className="px-5 py-10 text-center text-sm text-stone-500">No active events.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {events.map((e, i) => {
                const status = eventBadge(e);
                const { total, taken } = fill[i];
                const inner = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-stone-900">{e.nameEn}</div>
                        <div className="mt-0.5 text-xs text-stone-500">{fmtDate(e.startDate)} · {e._count.competitions} competitions</div>
                      </div>
                      <Badge className={badgeStyle[status]}>{STATUS_LABEL[status]}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Progress value={taken} max={total} />
                      <span className="shrink-0 text-xs text-stone-500 tabular">{taken}/{total} targets</span>
                    </div>
                  </>
                );
                return can(["ADMIN"])
                  ? <Link key={e.id} href={`/admin/events/${e.id}`} className="block px-5 py-4 transition hover:bg-stone-50">{inner}</Link>
                  : <div key={e.id} className="px-5 py-4">{inner}</div>;
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
