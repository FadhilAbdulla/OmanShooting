import Image from "next/image";
import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { NEWS, NEWS_KINDS, type NewsKind } from "@/lib/site-content";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";

export const metadata = { title: "News & media · Oman Traditional Shooting" };

/** WEB-04: official news, announcements, media coverage and press releases. */
export default async function News({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { locale } = await getDict();
  const ar = locale === "ar";
  const L = (x: { en: string; ar: string }) => (ar ? x.ar : x.en);
  const type = (await searchParams).type as NewsKind | undefined;
  const items = NEWS.filter((n) => !type || n.kind === type);
  const [lead, ...rest] = items;
  return (
    <div>
      <PageHeader ar={ar} title={ar ? "الأخبار والإعلام" : "News & media"} intro={ar ? "أخبار اللجنة وإعلاناتها والتغطية الإعلامية والبيانات الصحفية." : "Committee news, announcements, media coverage and press releases."} />
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        <Link href="/news" className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", !type ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 bg-white")}>{ar ? "الكل" : "All"}</Link>
        {(Object.keys(NEWS_KINDS) as NewsKind[]).map((k) => (
          <Link key={k} href={`/news?type=${k}`} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", type === k ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 bg-white")}>{L(NEWS_KINDS[k])}</Link>
        ))}
      </div>
      {!lead ? <p className="text-stone-500">{ar ? "لا توجد عناصر." : "Nothing here yet."}</p> : (
        <>
          <article className="grid overflow-hidden rounded-2xl border border-sand-200 bg-white md:grid-cols-2">
            <div className="relative aspect-[16/10] md:aspect-auto"><Image src={lead.image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" /></div>
            <div className="p-6">
              <Badge className="bg-brand-50 text-brand-700">{L(NEWS_KINDS[lead.kind])}</Badge>
              <h2 className="mt-3 text-2xl font-bold">{L(lead.title)}</h2>
              <time className="mt-1 block text-sm text-stone-500">{fmtDate(lead.date + "T08:00:00Z", locale)}</time>
              <p className="mt-3 text-stone-700">{L(lead.summary)}</p>
            </div>
          </article>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((n) => (
              <article key={n.slug} className="overflow-hidden rounded-xl border border-sand-200 bg-white">
                <div className="relative aspect-[16/10]"><Image src={n.image} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" /></div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-500"><Badge className="bg-sand-100 text-sand-700">{L(NEWS_KINDS[n.kind])}</Badge><time>{fmtDate(n.date + "T08:00:00Z", locale)}</time></div>
                  <h3 className="mt-2 font-semibold leading-snug">{L(n.title)}</h3>
                  <p className="mt-1 text-sm text-stone-600">{L(n.summary)}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
