import { getDict } from "@/lib/i18n";
import { CIRCULARS } from "@/lib/site-content";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Circulars & announcements · Oman Traditional Shooting" };

/** WEB-03: official circulars and announcements. */
export default async function Circulars() {
  const { locale } = await getDict();
  const ar = locale === "ar";
  const L = (x: { en: string; ar: string }) => (ar ? x.ar : x.en);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader ar={ar} title={ar ? "التعاميم والإعلانات الرسمية" : "Official circulars & announcements"} intro={ar ? "التعاميم الصادرة عن اللجنة، الأحدث أولاً." : "Circulars issued by the Committee, newest first."} />
      <ol className="relative space-y-4 border-s-2 border-sand-200 ps-6">
        {CIRCULARS.map((c) => (
          <li key={c.no} className="relative">
            <span className={`absolute -start-[31px] top-5 h-3.5 w-3.5 rounded-full ring-4 ring-sand-50 ${c.important ? "bg-brand-500" : "bg-sand-300"}`} />
            <article className="rounded-xl border border-sand-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="font-mono">{c.no}</span>·<time>{fmtDate(c.date + "T08:00:00Z", locale)}</time>
                {c.important && <Badge className="bg-brand-50 text-brand-700">{ar ? "مهم" : "Important"}</Badge>}
              </div>
              <h2 className="mt-1 font-semibold">{L(c.title)}</h2>
              <p className="mt-1 text-sm text-stone-600">{L(c.summary)}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
