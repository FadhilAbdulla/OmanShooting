import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n";
import { badgeStyle, eventBadge } from "@/lib/events";
import { leaderboard } from "@/lib/scoring";
import { Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { HOME, type HomeCopy } from "./home-copy";

export const dynamic = "force-dynamic";

const CARD_IMAGES = ["/images/nizwa-tower.jpg", "/images/adobe-wall.jpg", "/images/fort-archway.jpg", "/images/nizwa-cannon.jpg"];

export default async function Home() {
  const { locale } = await getDict();
  const c: HomeCopy = HOME[locale];
  const now = new Date();

  const [events, members, entries, govs, championships] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "CLOSED"] }, endDate: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
      orderBy: { startDate: "asc" },
      take: 6,
      include: {
        competitions: {
          select: { id: true, parentId: true, children: { select: { id: true } }, groups: { where: { isFinal: false, startsAt: { gt: new Date() } }, select: { _count: { select: { slots: { where: { state: "FREE" } } } } } } },
        },
      },
    }),
    prisma.user.count(),
    prisma.booking.count({ where: { status: "CONFIRMED", isTest: false } }),
    prisma.user.groupBy({ by: ["governorate"], where: { governorate: { not: null } } }),
    prisma.event.count({ where: { status: { in: ["PUBLISHED", "CLOSED"] } } }),
  ]);

  const next = events.find((e) => e.endDate >= new Date(now.getTime() - 86_400_000)) ?? events[0];
  const freeOf = (e: (typeof events)[number]) => e.competitions.reduce((a, k) => a + k.groups.reduce((b, g) => b + g._count.slots, 0), 0);

  // Live podium from the first competition that already has scores
  let podium: { event: string; slug: string; comp: string; rows: { rank: number; name: string; governorate: string | null; score: number }[] } | null = null;
  for (const e of events) {
    for (const k of e.competitions.filter((x) => !x.children.length)) {
      const lb = await leaderboard(k.id);
      if (lb.rows.length >= 3) {
        podium = { event: pick(e, locale), slug: e.slug, comp: pick(lb.comp, locale), rows: lb.rows.slice(0, 5).map((r) => ({ rank: r.rank, name: r.name, governorate: r.governorate, score: r.finalist ? r.combined : r.qual })) };
        break;
      }
    }
    if (podium) break;
  }

  return (
    <div className="-mb-6 -mt-6 mx-[calc(50%-50vw)]">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate flex min-h-[600px] items-center overflow-hidden text-white lg:min-h-[min(88vh,820px)]">
        <Image src="/images/hero-fort.jpg" alt={c.heroAlt} fill priority sizes="100vw" className="-z-20 object-cover object-[center_30%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-900/95 via-brand-900/70 to-brand-900/10 rtl:bg-gradient-to-l" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-[1.25fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sand-200/30 bg-white/10 px-3 py-1 text-xs font-medium text-sand-100 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {c.eyebrow}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{c.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg text-sand-100/90">{c.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#championships" className="inline-flex h-12 items-center rounded-lg bg-brand-500 px-6 font-semibold shadow-lg shadow-brand-900/40 transition hover:bg-brand-600">{c.ctaBrowse}</Link>
              <Link href="/login" className="inline-flex h-12 items-center rounded-lg border border-white/40 bg-white/10 px-6 font-semibold backdrop-blur transition hover:bg-white/20">{c.ctaJoin}</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sand-100/85">
              {c.trust.map((t) => <li key={t} className="flex items-center gap-2"><Check /> {t}</li>)}
            </ul>
          </div>

          {next && (
            <Link href={`/events/${next.slug}`} className="group block rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition hover:bg-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-sand-200">{c.nextUp}</span>
                <Badge className={badgeStyle[eventBadge(next)]}>{c.badge[eventBadge(next)]}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-bold">{pick(next, locale)}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-sand-200">{c.dates}</dt><dd className="font-medium">{fmtDate(next.startDate, locale)}</dd></div>
                <div><dt className="text-sand-200">{c.location}</dt><dd className="font-medium">{next.location.split("—")[0]}</dd></div>
                <div><dt className="text-sand-200 first-letter:uppercase">{c.competitions}</dt><dd className="font-medium tabular">{next.competitions.filter((k) => !k.children.length).length}</dd></div>
                <div><dt className="text-sand-200 first-letter:uppercase">{c.placesLeft}</dt><dd className="font-medium tabular">{freeOf(next)}</dd></div>
              </dl>
              <div className="mt-6 flex items-center justify-between rounded-lg bg-white px-4 py-3 font-semibold text-brand-700">
                {c.chooseTarget} <span className="transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1">→</span>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ───────── Stats band ───────── */}
      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-4">
        <div className="grid grid-cols-2 divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xl shadow-stone-900/5 sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
          {[[members, c.stats.members], [championships, c.stats.championships], [entries, c.stats.entries], [govs.length, c.stats.governorates]].map(([n, l]) => (
            <div key={String(l)} className="p-6 text-center">
              <div className="text-3xl font-bold text-brand-600 tabular sm:text-4xl">{Number(n).toLocaleString(locale === "ar" ? "ar-OM" : "en")}</div>
              <div className="mt-1 text-sm text-stone-600">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Championships ───────── */}
      <section id="championships" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <SectionHead kicker={c.champKicker} title={c.champTitle} sub={c.champSub} />
        {!events.length ? (
          <p className="mt-10 rounded-xl border border-dashed border-sand-300 p-10 text-center text-stone-500">{c.noEvents}</p>
        ) : (
          <div className="mt-10 flex flex-wrap justify-center gap-6">
            {events.map((e, i) => {
              const b = eventBadge(e);
              const comps = e.competitions.filter((k) => !k.children.length).length;
              return (
                <Link key={e.id} href={`/events/${e.slug}`} className="group flex w-full flex-col overflow-hidden rounded-2xl sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] border border-sand-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-44 overflow-hidden">
                    <Image src={CARD_IMAGES[i % CARD_IMAGES.length]} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge className={`absolute start-3 top-3 ${badgeStyle[b]}`}>{c.badge[b]}</Badge>
                    <div className="absolute bottom-3 start-4 text-sm font-medium text-white">{fmtDate(e.startDate, locale)}</div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-semibold leading-snug">{pick(e, locale)}</h3>
                    <p className="mt-1 text-sm text-stone-600">{e.location}</p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-stone-600">
                      <span><b className="text-stone-900 tabular">{comps}</b> {c.competitions}</span>
                      <span><b className="text-stone-900 tabular">{freeOf(e)}</b> {c.placesLeft}</span>
                    </div>
                    <div className="mt-auto pt-5 text-sm font-semibold text-brand-600">{b === "OPEN" ? c.bookNow : c.viewDetails} →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────── How it works ───────── */}
      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <SectionHead kicker={c.howKicker} title={c.howTitle} sub={c.howSub} align="start" />
            <ol className="mt-10 space-y-6">
              {c.steps.map((s, i) => (
                <li key={s.t} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold text-white shadow-md shadow-brand-500/30">{i + 1}</span>
                  <div><h3 className="font-semibold">{s.t}</h3><p className="mt-1 text-sm text-stone-600">{s.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl">
              <Image src="/images/fort-archway.jpg" alt={c.archAlt} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 start-6 max-w-xs rounded-2xl border border-sand-200 bg-white p-4 shadow-xl sm:start-[-1.5rem]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check /></span>
                <div><div className="text-sm font-semibold">{c.floatTitle}</div><div className="text-xs text-stone-500">{c.floatSub}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Live results ───────── */}
      {podium && (
        <section className="heritage-bg py-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sand-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> {c.liveKicker}</span>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{c.liveTitle}</h2>
              <p className="mt-4 text-sand-200">{c.liveSub}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/results/${podium.slug}`} className="inline-flex h-11 items-center rounded-lg bg-white px-5 font-semibold text-brand-700 hover:bg-sand-100">{c.fullResults}</Link>
                <Link href={`/tv/${podium.slug}`} className="inline-flex h-11 items-center rounded-lg border border-white/30 px-5 font-semibold hover:bg-white/10">{c.tvMode}</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
              <div className="text-sm text-sand-300">{podium.event}</div>
              <div className="text-lg font-semibold">{podium.comp}</div>
              <ol className="mt-4 divide-y divide-white/10">
                {podium.rows.map((r) => (
                  <li key={r.rank} className="flex items-center gap-4 py-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${r.rank === 1 ? "bg-amber-400 text-amber-950" : r.rank === 2 ? "bg-stone-300 text-stone-800" : r.rank === 3 ? "bg-orange-300 text-orange-950" : "bg-white/10"}`}>{r.rank}</span>
                    <div className="flex-1"><div className="font-medium">{r.name}</div><div className="text-xs text-sand-300">{r.governorate}</div></div>
                    <span className="text-2xl font-bold tabular">{r.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Heritage ───────── */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div className="grid grid-cols-5 grid-rows-2 gap-3 sm:h-[440px]">
            <div className="relative col-span-3 row-span-2 min-h-64 overflow-hidden rounded-2xl">
              <Image src="/images/heritage-nizwa.jpg" alt={c.nizwaAlt} fill sizes="(min-width:1024px) 30vw, 60vw" className="object-cover" />
            </div>
            <div className="relative col-span-2 min-h-32 overflow-hidden rounded-2xl">
              <Image src="/images/nizwa-cannon.jpg" alt={c.cannonAlt} fill sizes="20vw" className="object-cover" />
            </div>
            <div className="relative col-span-2 min-h-32 overflow-hidden rounded-2xl">
              <Image src="/images/adobe-wall.jpg" alt={c.adobeAlt} fill sizes="20vw" className="object-cover" />
            </div>
          </div>
          <div>
            <SectionHead kicker={c.heritageKicker} title={c.heritageTitle} align="start" />
            {c.heritageBody.map((p) => <p key={p.slice(0, 20)} className="mt-4 text-stone-700">{p}</p>)}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {c.weapons.map((w) => (
                <div key={w.t} className="rounded-xl border border-sand-200 bg-white p-4">
                  <div className="font-semibold text-brand-700">{w.t}</div>
                  <div className="mt-1 text-sm text-stone-600">{w.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── For organisers ───────── */}
      <section className="bg-sand-100/70 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHead kicker={c.orgKicker} title={c.orgTitle} sub={c.orgSub} />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f) => (
              <div key={f.t} className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden><FeatureIcon name={f.i} /></div>
                <h3 className="mt-4 font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-stone-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="px-4 py-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl text-white">
          <Image src="/images/heritage-nizwa.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-brand-900/85" />
          <div className="flex flex-col items-start gap-6 p-10 sm:p-14 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">{c.ctaTitle}</h2>
              <p className="mt-3 max-w-xl text-sand-200">{c.ctaSub}</p>
            </div>
            <Link href="/login" className="inline-flex h-12 shrink-0 items-center rounded-lg bg-white px-7 font-semibold text-brand-700 shadow-lg hover:bg-sand-100">{c.ctaJoin}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ kicker, title, sub, align = "center" }: { kicker: string; title: string; sub?: string; align?: "center" | "start" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : ""}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{kicker}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-stone-600">{sub}</p>}
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  setup: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75",
  live: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  checkin: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5zM13.5 13.5h1.5v1.5h-1.5zM16.5 16.5h1.5V18h-1.5zM19.5 13.5h.75v.75h-.75zM13.5 19.5h.75v.75h-.75zM19.5 19.5h.75v.75h-.75zM16.5 13.5h.75v.75h-.75z",
  scoring: "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0",
  payments: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z",
  secure: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
};

function FeatureIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d={ICONS[name] ?? ICONS.setup} />
    </svg>
  );
}
