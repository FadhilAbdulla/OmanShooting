import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/bottom-nav";
import { prisma } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n";
import { leaderboard } from "@/lib/scoring";
import { HOME, type HomeCopy } from "./home-copy";

export const dynamic = "force-dynamic";

const STEP_ICONS = ["shield", "target", "card", "trophy"];

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
        },
      },
    },
  });

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
            <div className="mt-7">
              <Link href="/events" className="inline-flex h-11 items-center rounded-lg bg-white px-5 font-semibold text-brand-700 hover:bg-sand-100">{c.ctaBrowse}</Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/20 shadow-2xl">
            <Image src="/images/hero-shooter.jpg" alt={c.shooterAlt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="border-y border-sand-200 bg-sand-50 py-14 lg:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold tracking-tight sm:text-3xl">{c.howTitle}</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map((step, index) => (
              <li key={step.t} className="relative rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <Icon name={STEP_ICONS[index]} className="h-6 w-6" />
                  </span>
                  <span className="text-3xl font-bold tabular text-sand-200">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 font-semibold text-stone-900">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.d}</p>
              </li>
            ))}
          </ol>
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
