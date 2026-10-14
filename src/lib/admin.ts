/** Admin automations — the "fewer clicks" layer. */
import { Prisma, type Competition } from "@prisma/client";
import { prisma } from "./db";
import { AppError, dateOnly, muscatDateTime } from "./utils";
import { audit } from "./audit";
import { eventBadge } from "./events";

export const PRESETS = {
  "individual-10": { label: "Individual · 10 shots", nameEn: "Individual 10 Shots", nameAr: "فردي ١٠ طلقات", format: "INDIVIDUAL", shotsPerSeries: 10, seriesCount: 1, targetsPerGroup: 10, prices: [5, 3] },
  "individual-7": { label: "Individual · 7 shots", nameEn: "Individual 7 Shots", nameAr: "فردي ٧ طلقات", format: "INDIVIDUAL", shotsPerSeries: 7, seriesCount: 1, targetsPerGroup: 10, prices: [5, 3] },
  "series-3x10": { label: "3 series × 10 shots", nameEn: "Three Series", nameAr: "ثلاث سلاسل", format: "INDIVIDUAL", shotsPerSeries: 10, seriesCount: 3, targetsPerGroup: 10, prices: [10] },
  "team-3": { label: "Team · 3 shooters", nameEn: "Team Competition", nameAr: "مسابقة الفرق", format: "TEAM", teamSize: 3, shotsPerSeries: 10, seriesCount: 1, targetsPerGroup: 12, prices: [5] },
} as const;

export type PresetKey = keyof typeof PRESETS;

export const AGE_BANDS = {
  U18: { label: "Under 18", ar: "تحت ١٨", minAge: null, maxAge: 17 },
  "18-39": { label: "18–39", ar: "١٨–٣٩", minAge: 18, maxAge: 39 },
  "40+": { label: "40+", ar: "٤٠+", minAge: 40, maxAge: null },
  OPEN: { label: "Open", ar: "مفتوح", minAge: null, maxAge: null },
} as const;

/**
 * Generate sub-competitions for every gender × age band combination in one click.
 * Sub-competitions inherit format, shots, venue, targets and prices from the parent.
 */
export async function generateMatrix(parentId: string, genders: ("MALE" | "FEMALE")[], bands: (keyof typeof AGE_BANDS)[], actorId: string) {
  const parent = await prisma.competition.findUniqueOrThrow({ where: { id: parentId } });
  const created: Competition[] = [];
  let order = await prisma.competition.count({ where: { parentId } });
  for (const g of genders) {
    for (const b of bands) {
      const band = AGE_BANDS[b];
      const gEn = g === "MALE" ? "Men" : "Women";
      const gAr = g === "MALE" ? "رجال" : "سيدات";
      const exists = await prisma.competition.findFirst({ where: { parentId, genderRule: g, minAge: band.minAge, maxAge: band.maxAge } });
      if (exists) continue;
      created.push(
        await prisma.competition.create({
          data: {
            ...inherit(parent), parentId, sortOrder: order++,
            nameEn: `${parent.nameEn} — ${gEn} ${band.label}`, nameAr: `${parent.nameAr} — ${gAr} ${band.ar}`,
            genderRule: g, minAge: band.minAge, maxAge: band.maxAge,
          },
        }),
      );
    }
  }
  await audit(actorId, "competition.matrix", "Competition", parentId, { created: created.length });
  return created;
}

function inherit(c: Competition) {
  return {
    eventId: c.eventId, firearm: c.firearm, format: c.format, teamSize: c.teamSize, shotsPerSeries: c.shotsPerSeries,
    seriesCount: c.seriesCount, maxScorePerShot: c.maxScorePerShot, venueType: c.venueType, targetsPerGroup: c.targetsPerGroup,
    leftHandTargets: c.leftHandTargets, enforceHand: c.enforceHand, prices: c.prices, maxAttempts: c.maxAttempts, maxParticipants: c.maxParticipants,
    finalistsCount: c.finalistsCount,
  };
}

export type ScheduleInput = {
  competitionIds: string[];
  dates: string[]; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  durationMin: number;
  gapMin: number;
  targets?: number | null; // override; default = competition.targetsPerGroup
};

/** TOUR-04: batch scheduling — preview first, then create. Slots are generated automatically. */
export function previewSchedule(input: ScheduleInput) {
  const out: { date: string; label: string; startsAt: Date; endsAt: Date }[] = [];
  for (const date of input.dates) {
    let t = muscatDateTime(date, input.startTime).getTime();
    const end = muscatDateTime(date, input.endTime).getTime();
    let n = 1;
    while (t + input.durationMin * 60_000 <= end) {
      out.push({ date, label: `G${n++}`, startsAt: new Date(t), endsAt: new Date(t + input.durationMin * 60_000) });
      t += (input.durationMin + input.gapMin) * 60_000;
      if (n > 100) break;
    }
  }
  return out;
}

export async function createSchedule(input: ScheduleInput, actorId: string) {
  const plan = previewSchedule(input);
  if (!plan.length) throw new AppError("The time window is too short for one group");
  const comps = await prisma.competition.findMany({ where: { id: { in: input.competitionIds } }, include: { children: { select: { id: true } } } });
  // Groups belong to leaf competitions; selecting a parent schedules all its sub-competitions
  const leaves = comps.flatMap((c) => (c.children.length ? [] : [c]));
  const childIds = comps.flatMap((c) => c.children.map((ch) => ch.id));
  const children = childIds.length ? await prisma.competition.findMany({ where: { id: { in: childIds } } }) : [];
  const targetsOf = [...leaves, ...children];
  let groups = 0;
  for (const c of targetsOf) {
    const targets = input.targets || c.targetsPerGroup;
    for (const p of plan) {
      const dup = await prisma.group.findFirst({ where: { competitionId: c.id, startsAt: p.startsAt } });
      if (dup) continue;
      const existingSameDay = await prisma.group.count({ where: { competitionId: c.id, date: dateOnly(p.date), isFinal: false } });
      await prisma.group.create({
        data: {
          competitionId: c.id, label: `G${existingSameDay + 1}`, date: dateOnly(p.date), startsAt: p.startsAt, endsAt: p.endsAt,
          slots: { create: [...Array(targets)].map((_, i) => ({ targetNo: i + 1, isLeftHand: c.leftHandTargets.includes(i + 1) })) },
        },
      });
      groups++;
    }
  }
  await audit(actorId, "schedule.generate", "Competition", input.competitionIds.join(","), { groups });
  return { groups, competitions: targetsOf.length };
}

/** One-click clone: copy an event with all competitions, sub-competitions and groups shifted to a new start date. */
export async function cloneEvent(eventId: string, newStart: string, actorId: string) {
  const src = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { competitions: { include: { groups: { where: { isFinal: false }, include: { slots: true } } }, orderBy: { parentId: { sort: "asc", nulls: "first" } } } },
  });
  const shift = dateOnly(newStart).getTime() - src.startDate.getTime();
  const sh = (d: Date) => new Date(d.getTime() + shift);
  const year = new Date(dateOnly(newStart)).getUTCFullYear();
  const baseSlug = `${src.slug.replace(/-\d{4}(-\d+)?$/, "")}-${year}`;
  let slug = baseSlug;
  for (let i = 2; await prisma.event.findUnique({ where: { slug } }); i++) slug = `${baseSlug}-${i}`;

  const ev = await prisma.event.create({
    data: {
      slug, nameEn: src.nameEn.replace(/\d{4}/, String(year)), nameAr: src.nameAr, descriptionEn: src.descriptionEn, descriptionAr: src.descriptionAr,
      location: src.location, season: year, startDate: sh(src.startDate), endDate: sh(src.endDate),
      regOpensAt: new Date(Math.max(Date.now(), sh(src.regOpensAt).getTime())), regClosesAt: sh(src.regClosesAt),
      holdMinutes: src.holdMinutes, cancelHours: src.cancelHours, maxCancellations: src.maxCancellations,
      paymentDeadlineHours: src.paymentDeadlineHours, allowCash: src.allowCash, allowTransfer: src.allowTransfer, status: "DRAFT",
    },
  });
  const idMap = new Map<string, string>();
  for (const c of src.competitions) {
    const { id, eventId: _e, parentId, createdAt: _c, resultsLockedAt: _r, groups, ...rest } = c;
    void _e; void _c; void _r;
    const nc = await prisma.competition.create({
      data: { ...rest, prices: rest.prices as Prisma.Decimal[], eventId: ev.id, parentId: parentId ? idMap.get(parentId) ?? null : null },
    });
    idMap.set(id, nc.id);
    for (const g of groups) {
      await prisma.group.create({
        data: {
          competitionId: nc.id, label: g.label, date: sh(g.date), startsAt: sh(g.startsAt), endsAt: sh(g.endsAt),
          slots: { create: g.slots.map((s) => ({ targetNo: s.targetNo, isLeftHand: s.isLeftHand, state: s.state === "BLOCKED" ? "BLOCKED" : "FREE" })) },
        },
      });
    }
  }
  await audit(actorId, "event.clone", "Event", ev.id, { from: eventId });
  return ev;
}

/** Publish checklist — shown to admins before they can go live. */
export async function publishChecklist(eventId: string) {
  const ev = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { competitions: { include: { children: { select: { id: true } }, _count: { select: { groups: true } } } } },
  });
  const leaves = ev.competitions.filter((c) => !c.children.length);
  const checks = [
    { ok: ev.competitions.length > 0, label: "At least one competition" },
    { ok: leaves.length > 0 && leaves.every((c) => c._count.groups > 0), label: "Every competition has scheduled groups" },
    { ok: leaves.every((c) => c.prices.length > 0), label: "Every competition has a price (0 is allowed)" },
    { ok: ev.regClosesAt > ev.regOpensAt, label: "Registration window is valid" },
    { ok: ev.regClosesAt <= new Date(ev.endDate.getTime() + 86_400_000), label: "Registration closes before the event ends" },
  ];
  return { ev, checks, ready: checks.every((c) => c.ok), badge: eventBadge(ev) };
}

/** Draft → Published. Test bookings made while in draft are purged automatically. */
export async function setEventStatus(eventId: string, status: "DRAFT" | "PUBLISHED" | "CLOSED", actorId: string) {
  if (status === "PUBLISHED") {
    const { ready, ev } = await publishChecklist(eventId);
    if (!ready) throw new AppError("Complete the publish checklist first", 409);
    if (ev.status === "DRAFT") await resetTestData(eventId, actorId);
  }
  if (status === "DRAFT") {
    const live = await prisma.booking.count({ where: { competition: { eventId }, isTest: false, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } } });
    if (live) throw new AppError("This event has live bookings and cannot return to draft", 409);
  }
  await prisma.event.update({ where: { id: eventId }, data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined } });
  await audit(actorId, `event.${status.toLowerCase()}`, "Event", eventId);
}

export async function resetTestData(eventId: string, actorId: string) {
  const compIds = (await prisma.competition.findMany({ where: { eventId }, select: { id: true } })).map((c) => c.id);
  const testBookings = await prisma.booking.findMany({ where: { competitionId: { in: compIds }, isTest: true }, select: { id: true, orderId: true } });
  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { id: { in: testBookings.map((b) => b.id) } } }),
    prisma.order.deleteMany({ where: { id: { in: testBookings.map((b) => b.orderId!).filter(Boolean) }, isTest: true } }),
    prisma.group.deleteMany({ where: { competitionId: { in: compIds }, isFinal: true } }),
    prisma.slot.updateMany({
      where: { group: { competitionId: { in: compIds } }, state: { not: "BLOCKED" } },
      data: { state: "FREE", userId: null, holdExpiresAt: null },
    }),
    prisma.competition.updateMany({ where: { eventId }, data: { resultsLockedAt: null } }),
    prisma.event.update({ where: { id: eventId }, data: { participantSeq: 0 } }),
  ]);
  await audit(actorId, "event.resetTest", "Event", eventId, { removed: testBookings.length });
  return testBookings.length;
}
