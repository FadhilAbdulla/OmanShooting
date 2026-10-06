import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { publishChecklist } from "@/lib/admin";
import { Badge } from "@/components/ui";
import { badgeStyle } from "@/lib/events";
import { cn, fmtDate, isoDate } from "@/lib/utils";
import { StatusBar } from "./status-bar";
import { Competitions } from "./competitions";
import { Schedule } from "./schedule";
import { Bookings } from "./bookings";
import { EventForm } from "../event-form";

export const dynamic = "force-dynamic";

const toLocal = (d: Date) => new Date(d.getTime() + 4 * 3_600_000).toISOString().slice(0, 16);

export default async function EventAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requirePageRole(["ADMIN"]);
  const { id } = await params;
  const tab = (await searchParams).tab ?? "competitions";
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) notFound();
  const { checks, ready, badge } = await publishChecklist(id);
  const testCount = await prisma.booking.count({ where: { competition: { eventId: id }, isTest: true } });

  const comps = await prisma.competition.findMany({
    where: { eventId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { groups: true, bookings: { where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } } } } } },
  });
  const tabs = [["competitions", `Competitions (${comps.length})`], ["schedule", "Schedule & targets"], ["bookings", "Bookings"], ["settings", "Settings"]];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/events" className="text-sm text-stone-500 hover:underline">← Events</Link>
          <h1 className="text-2xl font-bold">{ev.nameEn} <Badge className={cn(badgeStyle[badge], "align-middle")}>{badge.replace("_", " ")}</Badge></h1>
          <p className="text-sm text-stone-600">{ev.nameAr} · {ev.location} · {fmtDate(ev.startDate)} → {fmtDate(ev.endDate)}</p>
        </div>
      </div>
      <StatusBar id={ev.id} slug={ev.slug} status={ev.status} checks={checks} ready={ready} testCount={testCount} />
      <div className="flex gap-1 border-b border-sand-200">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`?tab=${k}`} className={cn("-mb-px border-b-2 px-4 py-2 text-sm", tab === k ? "border-brand-500 font-medium text-brand-700" : "border-transparent text-stone-600 hover:text-stone-900")}>{l}</Link>
        ))}
      </div>
      {tab === "competitions" && (
        <Competitions eventId={ev.id} comps={comps.map((c) => ({ ...c, prices: c.prices.map(Number), createdAt: undefined, resultsLockedAt: c.resultsLockedAt?.toISOString() ?? null }))} />
      )}
      {tab === "schedule" && <ScheduleTab eventId={ev.id} start={isoDate(ev.startDate)} end={isoDate(ev.endDate)} />}
      {tab === "bookings" && <Bookings eventId={ev.id} />}
      {tab === "settings" && (
        <EventForm id={ev.id} initial={{
          nameEn: ev.nameEn, nameAr: ev.nameAr, descriptionEn: ev.descriptionEn ?? "", descriptionAr: ev.descriptionAr ?? "", location: ev.location,
          startDate: isoDate(ev.startDate), endDate: isoDate(ev.endDate), regOpensAt: toLocal(ev.regOpensAt), regClosesAt: toLocal(ev.regClosesAt),
          holdMinutes: ev.holdMinutes, cancelHours: ev.cancelHours, maxCancellations: ev.maxCancellations, paymentDeadlineHours: ev.paymentDeadlineHours,
          allowCash: ev.allowCash, allowTransfer: ev.allowTransfer,
        }} />
      )}
    </div>
  );
}

async function ScheduleTab({ eventId, start, end }: { eventId: string; start: string; end: string }) {
  const comps = await prisma.competition.findMany({
    where: { eventId }, orderBy: { sortOrder: "asc" },
    include: {
      children: { select: { id: true } },
      groups: {
        orderBy: { startsAt: "asc" },
        include: { slots: { orderBy: { targetNo: "asc" }, select: { id: true, targetNo: true, state: true, isLeftHand: true, holdExpiresAt: true } } },
      },
    },
  });
  const now = Date.now();
  return (
    <Schedule
      eventId={eventId} start={start} end={end}
      comps={comps.map((c) => ({
        id: c.id, name: c.nameEn, parentId: c.parentId, isParent: c.children.length > 0, targets: c.targetsPerGroup,
        groups: c.groups.map((g) => ({
          id: g.id, label: g.label, date: isoDate(g.date), startsAt: g.startsAt.toISOString(), endsAt: g.endsAt.toISOString(), isFinal: g.isFinal,
          slots: g.slots.map((s) => ({ id: s.id, targetNo: s.targetNo, isLeftHand: s.isLeftHand, state: (s.state === "HELD" || s.state === "PENDING") && s.holdExpiresAt && s.holdExpiresAt.getTime() < now ? "FREE" : s.state })),
        })),
      }))}
    />
  );
}
