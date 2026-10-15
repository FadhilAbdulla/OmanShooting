import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession, hasRole } from "@/lib/auth";
import { getDict, pick } from "@/lib/i18n";
import { badgeStyle, eventBadge, genderLabel } from "@/lib/events";
import { Places, VENUE, VenueBadge, VenueLegend } from "@/components/venue";
import type { VenueType } from "@prisma/client";
import { ageLabel, checkEligibility } from "@/lib/eligibility";
import { Badge, Card, LinkButton } from "@/components/ui";
import { ageOn, fmtDate, fmtDateTime, fmtTime, omr } from "@/lib/utils";
import { Icon } from "@/components/bottom-nav";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ show?: string; firearm?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { locale } = await getDict();
  const s = await getSession();
  const ev = await prisma.event.findUnique({
    where: { slug },
    include: {
      competitions: {
        orderBy: [{ sortOrder: "asc" }],
        include: { groups: { where: { isFinal: false, startsAt: { gt: new Date() } }, select: { id: true, date: true, _count: { select: { slots: { where: { state: "FREE" } } } } } } },
      },
    },
  });
  if (!ev) notFound();
  const isAdmin = hasRole(s, ["ADMIN"]);
  if (ev.status === "DRAFT" && !isAdmin) notFound();
  const user = s ? await prisma.user.findUnique({ where: { id: s.uid } }) : null;
  const badge = eventBadge(ev);
  const roots = ev.competitions.filter((c) => !c.parentId);
  const kids = (id: string) => ev.competitions.filter((c) => c.parentId === id);

  // Smart filtering: signed-in shooters see only what they can enter (gender, age), narrowed by firearm if chosen,
  // and place counts only include targets that suit their dominant hand
  const showAll = !user || sp.show === "all";
  const firearms = [...new Set(roots.map((r) => r.firearm))];
  const firearm = sp.firearm && firearms.includes(sp.firearm) ? sp.firearm : null;
  const eligible = (c: (typeof ev.competitions)[number]) => !user || checkEligibility(user, c, ev.startDate).ok;
  const leaves = roots.flatMap((root) => (kids(root.id).length ? kids(root.id) : [root]));
  const eligibleCount = leaves.filter(eligible).length;
  const shown = roots
    .filter((root) => !firearm || root.firearm === firearm)
    .map((root) => ({ root, list: (kids(root.id).length ? kids(root.id) : [root]).filter((c) => showAll || eligible(c)) }))
    .filter((x) => x.list.length);
  const filterHref = (next: { show?: string | null; firearm?: string | null }) => {
    const q = new URLSearchParams();
    const show = next.show !== undefined ? next.show : sp.show;
    const fa = next.firearm !== undefined ? next.firearm : firearm;
    if (show) q.set("show", show);
    if (fa) q.set("firearm", fa);
    const qs = q.toString();
    return `/events/${ev.slug}${qs ? `?${qs}` : ""}#competitions`;
  };
  const leftFree = user
    ? Object.fromEntries((await prisma.slot.groupBy({
        by: ["groupId"], _count: { _all: true },
        where: { state: "FREE", isLeftHand: true, group: { isFinal: false, startsAt: { gt: new Date() }, competition: { eventId: ev.id } } },
      })).map((r) => [r.groupId, r._count._all]))
    : {};
  const lefty = user?.hand === "LEFT";
  const placesFor = (c: (typeof ev.competitions)[number]) => {
    const all = c.groups.reduce((a, g) => a + g._count.slots, 0);
    const perGroup = c.targetsPerGroup;
    if (!user || !c.enforceHand) return { free: all, total: c.groups.length * perGroup };
    const left = c.groups.reduce((a, g) => a + (leftFree[g.id] ?? 0), 0);
    const leftTargets = c.leftHandTargets.filter((n) => n <= perGroup).length;
    return lefty
      ? { free: left, total: c.groups.length * leftTargets }
      : { free: all - left, total: c.groups.length * (perGroup - leftTargets) };
  };
  const age = user ? ageOn(user.dob, ev.startDate) : null;

  // Programme: every session of the event, folded into one line per competition per day (finals listed apart)
  const sessions = await prisma.group.findMany({
    where: { competition: { eventId: ev.id } },
    orderBy: { startsAt: "asc" },
    select: { date: true, startsAt: true, endsAt: true, isFinal: true, competition: { select: { id: true, nameEn: true, nameAr: true, venueType: true } } },
  });
  type Line = { name: string; venue: VenueType; from: Date; to: Date; groups: number; isFinal: boolean };
  const days = new Map<string, Map<string, Line>>();
  for (const g of sessions) {
    const day = g.date.toISOString().slice(0, 10);
    const lines = days.get(day) ?? new Map<string, Line>();
    const key = `${g.competition.id}:${g.isFinal}`;
    const line = lines.get(key);
    if (line) {
      line.groups += 1;
      if (g.endsAt > line.to) line.to = g.endsAt;
    } else {
      lines.set(key, { name: pick(g.competition, locale), venue: g.competition.venueType, from: g.startsAt, to: g.endsAt, groups: 1, isFinal: g.isFinal });
    }
    days.set(day, lines);
  }
  // Consecutive days with an identical timetable collapse into one row ("Days 1–8")
  const timeOfDay = (d: Date) => fmtTime(d, locale);
  const programme: { first: number; last: number; from: string; to: string; lines: Line[] }[] = [];
  [...days].forEach(([day, map], index) => {
    const lines = [...map.values()].sort((a, b) => timeOfDay(a.from).localeCompare(timeOfDay(b.from)) || a.name.localeCompare(b.name));
    const signature = (list: Line[]) => list.map((l) => `${l.name}|${timeOfDay(l.from)}|${timeOfDay(l.to)}|${l.groups}|${l.isFinal}`).join(";");
    const prev = programme.at(-1);
    if (prev && prev.last === index - 1 && signature(prev.lines) === signature(lines)) { prev.last = index; prev.to = day; }
    else programme.push({ first: index, last: index, from: day, to: day, lines });
  });

  const description = locale === "ar" ? ev.descriptionAr : ev.descriptionEn;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.location}, Oman`)}`;
  const registration =
    badge === "OPEN" ? { tone: "text-oasis-600", text: `Open now — closes ${fmtDateTime(ev.regClosesAt, locale)}` }
    : badge === "COMING_SOON" ? { tone: "text-amber-700", text: `Opens ${fmtDateTime(ev.regOpensAt, locale)}` }
    : { tone: "text-stone-500", text: "Registration closed" };
  const payments = ["Card (Thawani)", ev.allowTransfer && "bank transfer", ev.allowCash && "cash at reception"].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {ev.status === "DRAFT" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Test mode.</b> This event is a draft — only admins can see it. Bookings you make here are flagged as test data and are wiped automatically when the event is published.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{pick(ev, locale)}</h1>
          {description && <p className="mt-2 max-w-2xl text-stone-700">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={badgeStyle[badge]}>{badge.replace("_", " ")}</Badge>
          {ev.status !== "DRAFT" && <LinkButton href={`/results/${ev.slug}`} variant="secondary" size="sm">Live results</LinkButton>}
        </div>
      </div>

      {/* Key facts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name="calendar" className="h-5 w-5" /></span>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Championship dates</div>
            <div className="mt-0.5 font-semibold">{fmtDate(ev.startDate, locale)}</div>
            {+ev.endDate !== +ev.startDate && <div className="text-sm text-stone-600">to {fmtDate(ev.endDate, locale)}</div>}
          </div>
        </Card>
        <Card className="flex gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name="target" className="h-5 w-5" /></span>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Location</div>
            <div className="mt-0.5 font-semibold">{ev.location}</div>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:underline">Open in Maps ↗</a>
          </div>
        </Card>
        <Card className="flex gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name="clock" className="h-5 w-5" /></span>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Registration</div>
            <div className="mt-0.5 text-sm">
              <span className="font-semibold">{fmtDate(ev.regOpensAt, locale)}</span> → <span className="font-semibold">{fmtDate(ev.regClosesAt, locale)}</span>
            </div>
            <div className={`text-sm font-medium ${registration.tone}`}>{registration.text}</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Programme */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-sand-200 px-5 py-4">
            <h2 className="font-semibold">Programme</h2>
            <p className="text-xs text-stone-600">Shooting sessions by day. Pick your exact group and target when you book.</p>
          </div>
          {!programme.length ? (
            <p className="px-5 py-8 text-center text-sm text-stone-500">The programme will be published soon.</p>
          ) : (
            <ol className="divide-y divide-sand-100">
              {programme.map(({ first, last, from, to, lines }) => (
                <li key={from} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:gap-6">
                  <div className="shrink-0 sm:w-36">
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">{first === last ? `Day ${first + 1}` : `Days ${first + 1}–${last + 1} · daily`}</div>
                    <div className="font-semibold">{fmtDate(from, locale)}</div>
                    {to !== from && <div className="text-sm text-stone-600">to {fmtDate(to, locale)}</div>}
                  </div>
                  <ul className="flex-1 space-y-2">
                    {lines.map((line) => (
                      <li key={`${line.name}:${line.isFinal}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                        <span className="w-28 shrink-0 font-medium text-stone-900 tabular">{fmtTime(line.from, locale)}–{fmtTime(line.to, locale)}</span>
                        <span className="flex flex-1 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${VENUE[line.venue].dot}`} title={VENUE[line.venue].label} />{line.name}</span>
                        {line.isFinal
                          ? <Badge className="bg-amber-100 text-amber-800">Final</Badge>
                          : <span className="text-xs text-stone-500">{line.groups} group{line.groups === 1 ? "" : "s"}</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Entry rules */}
        <Card className="self-start p-5">
          <h2 className="font-semibold">Good to know</h2>
          <ul className="mt-3 space-y-3 text-sm text-stone-700">
            <li className="flex gap-2"><Icon name="target" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Your chosen target is held for {ev.holdMinutes} minutes while you pay.</li>
            <li className="flex gap-2"><Icon name="card" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Pay by {payments}{ev.allowCash || ev.allowTransfer ? ` within ${ev.paymentDeadlineHours} hours` : ""}.</li>
            <li className="flex gap-2"><Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{ev.maxCancellations === 0 ? `Bookings can\u2019t be cancelled, but you can move to another target up to ${ev.cancelHours} hours before your group.` : `Cancel up to ${ev.cancelHours} hours before your group, at most ${ev.maxCancellations} time${ev.maxCancellations === 1 ? "" : "s"} per championship.`}</li>
            <li className="flex gap-2"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Bring your civil ID and membership QR code for check-in at the range.</li>
          </ul>
        </Card>
      </div>

      <div id="competitions" className="flex scroll-mt-24 flex-wrap items-end justify-between gap-3 pt-2">
        <h2 className="text-xl font-bold">Competitions &amp; entry</h2>
        <VenueLegend types={[...new Set(leaves.map((c) => c.venueType))]} />
      </div>

      {/* Filters */}
      {(user || firearms.length > 1) && <Card className="space-y-3 p-4">
        {user && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-700">
              <span className="font-medium">Matched to your profile:</span>{" "}
              {user.gender === "MALE" ? "Man" : "Woman"} · {age != null ? `${age} yrs on the day` : "age not set"} · {user.hand === "LEFT" ? "left-handed" : "right-handed"}
            </p>
            <div className="inline-flex rounded-lg border border-sand-300 bg-sand-50 p-0.5 text-sm">
              <Link href={filterHref({ show: null })} className={`rounded-md px-3 py-1 ${!showAll ? "bg-white font-semibold text-brand-700 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}>For me ({eligibleCount})</Link>
              <Link href={filterHref({ show: "all" })} className={`rounded-md px-3 py-1 ${showAll ? "bg-white font-semibold text-brand-700 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}>All ({leaves.length})</Link>
            </div>
          </div>
        )}
        {firearms.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-500">Firearm:</span>
            {[null, ...firearms].map((f) => (
              <Link key={f ?? "all"} href={filterHref({ firearm: f })}
                className={`rounded-full border px-3 py-1 ${firearm === f ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-sand-300 bg-white text-stone-700 hover:bg-sand-100"}`}>
                {f ?? "All"}
              </Link>
            ))}
          </div>
        )}
      </Card>}

      <div className="space-y-4">
        {!shown.length && (
          <div className="rounded-xl border border-dashed border-sand-300 p-8 text-center text-sm text-stone-600">
            No competitions match {firearm ? "this firearm and " : ""}your profile.{" "}
            <Link href={filterHref({ show: "all", firearm: null })} className="font-medium text-brand-600 underline">Show all competitions</Link>
          </div>
        )}
        {shown.map(({ root, list }) => {
          return (
            <Card key={root.id} className="overflow-hidden">
              <div className="border-b border-sand-200 bg-sand-100/60 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{pick(root, locale)}</h2>
                  {/* Sub-competitions can use a different range, so the badge moves to each row when they differ */}
                  {new Set(list.map((c) => c.venueType)).size === 1 && <VenueBadge type={list[0].venueType} />}
                </div>
                <p className="text-xs text-stone-600">
                  {root.firearm} · {root.format === "TEAM" ? `Team of ${root.teamSize}` : "Individual"} · {root.seriesCount > 1 ? `${root.seriesCount} × ` : ""}{root.shotsPerSeries} shots
                </p>
              </div>
              <div className="divide-y divide-sand-100">
                {list.map((c) => {
                  const { free, total } = placesFor(c);
                  const dates = new Set(c.groups.map((g) => g.date.toISOString())).size;
                  const elig = user ? checkEligibility(user, c, ev.startDate) : { ok: true };
                  return (
                    <div key={c.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{pick(c, locale)}</span>
                          {new Set(list.map((x) => x.venueType)).size > 1 && <VenueBadge type={c.venueType} short />}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge className="bg-sand-100 text-sand-700">{genderLabel[c.genderRule]}</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{ageLabel(c)}</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{c.targetsPerGroup} targets / group</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{c.prices.map((p, i) => `${i ? `#${i + 1} ` : ""}${omr(p)}`).join(" · ")}</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{dates ? `${dates} day(s) left` : "No upcoming groups"}</Badge>
                        </div>
                      </div>
                      {/* Phones: places + action share one row under the details */}
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <Places left={free} total={total} className="w-40" />
                      {!elig.ok ? (
                        <span className="text-xs text-rose-700">{elig.reason}</span>
                      ) : !c.groups.length ? (
                        <span className="text-xs text-stone-500">No upcoming groups</span>
                      ) : !free ? (
                        <span className="text-xs font-medium text-rose-700">Fully booked</span>
                      ) : badge === "OPEN" || ev.status === "DRAFT" ? (
                        <LinkButton href={`/events/${ev.slug}/book?c=${c.id}`} size="sm">Choose target</LinkButton>
                      ) : (
                        <span className="text-xs text-stone-500">{badge === "COMING_SOON" ? `Opens ${fmtDate(ev.regOpensAt, locale)}` : "Closed"}</span>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      {!s && <p className="text-sm text-stone-600"><Link href={`/login?next=/events/${ev.slug}`} className="text-brand-600 underline">Sign in</Link> or <Link href={`/signup?next=/events/${ev.slug}`} className="text-brand-600 underline">create your membership</Link> to book — we&apos;ll then show only the competitions you can enter and the targets that suit your hand.</p>}
    </div>
  );
}
