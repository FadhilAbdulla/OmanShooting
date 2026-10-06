import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession, hasRole } from "@/lib/auth";
import { getDict, pick } from "@/lib/i18n";
import { badgeStyle, eventBadge, genderLabel, venueLabel } from "@/lib/events";
import { ageLabel, checkEligibility } from "@/lib/eligibility";
import { Badge, Card, LinkButton } from "@/components/ui";
import { fmtDate, omr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  return (
    <div className="space-y-6">
      {ev.status === "DRAFT" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Test mode.</b> This event is a draft — only admins can see it. Bookings you make here are flagged as test data and are wiped automatically when the event is published.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{pick(ev, locale)}</h1>
          <p className="text-stone-600">{ev.location} · {fmtDate(ev.startDate, locale)} → {fmtDate(ev.endDate, locale)}</p>
          {(locale === "ar" ? ev.descriptionAr : ev.descriptionEn) && <p className="mt-2 max-w-2xl text-sm text-stone-700">{locale === "ar" ? ev.descriptionAr : ev.descriptionEn}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={badgeStyle[badge]}>{badge.replace("_", " ")}</Badge>
          {ev.status !== "DRAFT" && <LinkButton href={`/results/${ev.slug}`} variant="secondary" size="sm">Live results</LinkButton>}
        </div>
      </div>

      <div className="space-y-4">
        {roots.map((root) => {
          const list = kids(root.id).length ? kids(root.id) : [root];
          return (
            <Card key={root.id} className="overflow-hidden">
              <div className="border-b border-sand-200 bg-sand-100/60 px-5 py-3">
                <h2 className="font-semibold">{pick(root, locale)}</h2>
                <p className="text-xs text-stone-600">
                  {root.firearm} · {root.format === "TEAM" ? `Team of ${root.teamSize}` : "Individual"} · {root.seriesCount > 1 ? `${root.seriesCount} × ` : ""}{root.shotsPerSeries} shots · {venueLabel[root.venueType]}
                </p>
              </div>
              <div className="divide-y divide-sand-100">
                {list.map((c) => {
                  const free = c.groups.reduce((a, g) => a + g._count.slots, 0);
                  const dates = new Set(c.groups.map((g) => g.date.toISOString())).size;
                  const elig = user ? checkEligibility(user, c, ev.startDate) : { ok: true };
                  return (
                    <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{pick(c, locale)}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge className="bg-sand-100 text-sand-700">{genderLabel[c.genderRule]}</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{ageLabel(c)}</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{c.prices.map((p, i) => `${i ? `#${i + 1} ` : ""}${omr(p)}`).join(" · ")}</Badge>
                          <Badge className="bg-sand-100 text-sand-700">{dates ? `${dates} day(s) left` : "No upcoming groups"}</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-stone-600 tabular">{free} places left</div>
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
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      {!s && <p className="text-sm text-stone-600"><Link href={`/login?next=/events/${ev.slug}`} className="text-brand-600 underline">Sign in with your civil ID</Link> to book.</p>}
    </div>
  );
}
