import Link from "next/link";
import { Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { badgeStyle, eventBadge } from "@/lib/events";
import { getDict, pick } from "@/lib/i18n";
import { fmtDate } from "@/lib/utils";
import { HOME, type HomeCopy } from "../home-copy";

export const dynamic = "force-dynamic";

export default async function Events() {
  const { locale } = await getDict();
  const c: HomeCopy = HOME[locale];
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "CLOSED"] }, endDate: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
    orderBy: { startDate: "asc" },
    include: {
      competitions: {
        select: {
          children: { select: { id: true } },
          groups: {
            where: { isFinal: false, startsAt: { gt: now } },
            select: { _count: { select: { slots: { where: { state: "FREE" } } } } },
          },
        },
      },
    },
  });

  const freeOf = (event: (typeof events)[number]) =>
    event.competitions.reduce((total, competition) => total + competition.groups.reduce((sum, group) => sum + group._count.slots, 0), 0);

  return (
    <section className="py-4">
      <div className="max-w-2xl">
        <div className="text-sm font-semibold text-brand-700">{c.champKicker}</div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{c.champTitle}</h1>
        <p className="mt-2 text-stone-600">{c.champSub}</p>
      </div>

      {!events.length ? (
        <p className="mt-8 rounded-xl border border-dashed border-sand-300 p-8 text-center text-stone-500">{c.noEvents}</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {events.map((event) => {
            const status = eventBadge(event);
            const competitions = event.competitions.filter((item) => !item.children.length).length;
            return (
              <Link key={event.id} href={`/events/${event.slug}`} className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{pick(event, locale)}</h2>
                    <p className="mt-1 text-sm text-stone-600">{event.location}</p>
                  </div>
                  <Badge className={badgeStyle[status]}>{c.badge[status]}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-sand-100 pt-4 text-sm text-stone-600">
                  <span>{fmtDate(event.startDate, locale)}</span>
                  <span>{competitions} {c.competitions}</span>
                  <span>{freeOf(event)} {c.placesLeft}</span>
                  <span className="ms-auto font-semibold text-brand-700">{status === "OPEN" ? c.bookNow : c.viewDetails} →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
