import { getDict } from "@/lib/i18n";
import { REGULATION_GROUPS } from "@/lib/site-content";
import { PageHeader } from "@/components/page-header";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Regulations & laws · Oman Traditional Shooting" };

/** WEB-02: regulations, membership/registration terms, championship rules, licensing terms, guides. */
export default async function Regulations() {
  const { locale } = await getDict();
  const ar = locale === "ar";
  const L = (x: { en: string; ar: string }) => (ar ? x.ar : x.en);
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="lg:col-span-2">
        <PageHeader ar={ar} title={ar ? "اللوائح والأنظمة" : "Regulations & laws"} intro={ar ? "اللوائح والشروط والقواعد المنظِّمة للرماية التقليدية في السلطنة." : "The regulations, terms and rules that govern traditional shooting in the Sultanate."} />
      </div>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:px-0">
        {REGULATION_GROUPS.map((g) => <a key={g.key} href={`#${g.key}`} className="shrink-0 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm hover:border-brand-300">{L(g.title)}</a>)}
      </nav>
      <div className="space-y-8">
        {REGULATION_GROUPS.map((g) => (
          <section key={g.key} id={g.key} className="scroll-mt-24">
            <h2 className="text-lg font-semibold">{L(g.title)}</h2>
            <div className="mt-3 space-y-2">
              {g.docs.map((d) => (
                <details key={d.id} className="group rounded-xl border border-sand-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">PDF</span>
                    <span className="min-w-0 flex-1"><span className="block font-medium">{L(d.title)}</span><span className="text-xs text-stone-500">{L(d.category)} · {ar ? "آخر تحديث" : "Updated"} {fmtDate(d.updated + "T08:00:00Z", locale)}</span></span>
                    <span className="text-stone-400 transition group-open:rotate-180">▾</span>
                  </summary>
                  <div className="border-t border-sand-100 px-4 py-3 text-sm text-stone-700">
                    {L(d.summary)}
                    <div className="mt-3 text-xs text-stone-500">{ar ? "سيتوفر المستند الكامل للتحميل عند نشره من قبل اللجنة." : "The full document will be available to download once the Committee publishes it."}</div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
