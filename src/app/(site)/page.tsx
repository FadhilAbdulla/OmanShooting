import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { badgeStyle, eventBadge } from "@/lib/events";
import { getDict, pick } from "@/lib/i18n";
import { leaderboard } from "@/lib/scoring";
import { fmtDate } from "@/lib/utils";
import { HOME, type HomeCopy } from "./home-copy";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { locale } = await getDict();
  const c: HomeCopy = HOME[locale];
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "CLOSED"] }, endDate: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
    orderBy: { startDate: "asc" },
    take: 6,
    include: {
      competitions: {
        select: {
          id: true,
          children: { select: { id: true } },
          groups: {
            where: { isFinal: false, startsAt: { gt: now } },
            select: { _count: { select: { slots: { where: { state: "FREE" } } } } },
          },
        },
      },
    },
  });

  const next = events.find((event) => event.endDate >= new Date(now.getTime() - 86_400_000)) ?? events[0];
  const freeOf = (event: (typeof events)[number]) =>
    event.competitions.reduce((total, competition) => total + competition.groups.reduce((sum, group) => sum + group._count.slots, 0), 0);

  let podium: { event: string; slug: string; competition: string; rows: { rank: number; name: string; score: number }[] } | null = null;
  for (const event of events) {
    for (const competition of event.competitions.filter((item) => !item.children.length)) {
      const result = await leaderboard(competition.id);
      if (result.rows.length >= 3) {
        podium = {
          event: pick(event, locale),
          slug: event.slug,
          competition: pick(result.comp, locale),
          rows: result.rows.slice(0, 3).map((row) => ({ rank: row.rank, name: row.name, score: row.finalist ? row.combined : row.qual })),
        };
        break;
      }
    }
    if (podium) break;
  }

  return (
    <div className="-mx-[calc(50vw-50%)] -mb-6 -mt-6">
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <Image src="/images/hero-fort.jpg" alt={c.heroAlt} fill priority sizes="100vw" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-brand-900/80" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-20">
          <div>
            <div className="text-sm font-semibold text-sand-200">{c.eyebrow}</div>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{c.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-lg text-sand-100">{c.heroSub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#championships" className="inline-flex h-11 items-center rounded-lg bg-white px-5 font-semibold text-brand-700 hover:bg-sand-100">{c.ctaBrowse}</Link>
              <Link href="/login" className="inline-flex h-11 items-center rounded-lg border border-white/40 px-5 font-semibold hover:bg-white/10">{c.ctaJoin}</Link>
            </div>
          </div>

          {next && (
            <Link href={`/events/${next.slug}`} className="rounded-xl border border-white/20 bg-black/20 p-5 backdrop-blur-sm hover:bg-black/30">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-sand-200">{c.nextUp}</span>
                <Badge className={badgeStyle[eventBadge(next)]}>{c.badge[eventBadge(next)]}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-bold">{pick(next, locale)}</h2>
              <p className="mt-1 text-sm text-sand-200">{fmtDate(next.startDate, locale)} · {next.location}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-sm">
                <span>{freeOf(next)} {c.placesLeft}</span>
                <span className="font-semibold">{c.chooseTarget} →</span>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section id="championships" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-brand-700">{c.champKicker}</div>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{c.champTitle}</h2>
          </div>
          <p className="max-w-xl text-sm text-stone-600">{c.champSub}</p>
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
                      <h3 className="text-lg font-semibold">{pick(event, locale)}</h3>
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

      <section className="border-y border-sand-200 bg-sand-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">{c.howTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map((step, index) => (
              <div key={step.t} className="rounded-xl border border-sand-200 bg-white p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{index + 1}</div>
                <h3 className="mt-3 font-semibold">{step.t}</h3>
                <p className="mt-1 text-sm text-stone-600">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {podium && (
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <div className="text-sm font-semibold text-brand-700">{c.liveKicker}</div>
            <h2 className="mt-1 text-2xl font-bold">{c.liveTitle}</h2>
            <p className="mt-3 text-stone-600">{c.liveSub}</p>
            <Link href={`/results/${podium.slug}`} className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700">{c.fullResults}</Link>
          </div>
          <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-stone-500">{podium.event}</div>
            <div className="font-semibold">{podium.competition}</div>
            <ol className="mt-3 divide-y divide-sand-100">
              {podium.rows.map((row) => (
                <li key={row.rank} className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 font-bold text-brand-700">{row.rank}</span>
                  <span className="flex-1 font-medium">{row.name}</span>
                  <span className="text-xl font-bold tabular">{row.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
