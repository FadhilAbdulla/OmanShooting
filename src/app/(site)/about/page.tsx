import Image from "next/image";
import { getDict } from "@/lib/i18n";
import { COMMITTEE } from "@/lib/site-content";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";

export const metadata = { title: "Committee profile · Oman Traditional Shooting" };

/** WEB-01: Committee profile — vision, mission, responsibilities, structure and members. */
export default async function About() {
  const { locale } = await getDict();
  const ar = locale === "ar";
  const L = (x: { en: string; ar: string }) => (ar ? x.ar : x.en);
  return (
    <div>
      <PageHeader ar={ar} title={ar ? "عن اللجنة" : "Committee profile"} intro={L(COMMITTEE.intro)} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5"><div className="text-xs font-semibold uppercase tracking-widest text-brand-600">{ar ? "الرؤية" : "Vision"}</div><p className="mt-2 text-lg">{L(COMMITTEE.vision)}</p></Card>
        <Card className="p-5"><div className="text-xs font-semibold uppercase tracking-widest text-brand-600">{ar ? "الرسالة" : "Mission"}</div><p className="mt-2 text-lg">{L(COMMITTEE.mission)}</p></Card>
      </div>

      <section className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="text-xl font-semibold">{ar ? "المهام والاختصاصات" : "Responsibilities"}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {COMMITTEE.responsibilities.map((r) => (
              <li key={r.en} className="flex items-start gap-2 rounded-lg border border-sand-200 bg-white p-3 text-sm"><span className="mt-0.5 text-oasis-600">✓</span>{L(r)}</li>
            ))}
          </ul>
        </div>
        <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl lg:block">
          <Image src="/images/heritage-nizwa.jpg" alt={ar ? "قلعة نزوى" : "Nizwa Fort"} fill sizes="380px" className="object-cover" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{ar ? "الهيكل التنظيمي" : "Organisational structure"}</h2>
        <div className="mt-4 flex flex-col items-center gap-3">
          {COMMITTEE.structure.map((s, i) => (
            <div key={s.unit.en} className="flex w-full flex-col items-center gap-3">
              {i > 0 && <span className="h-5 w-px bg-sand-300" />}
              <div className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow">{L(s.unit)}</div>
              {s.children.length > 0 && (
                <>
                  <span className="h-5 w-px bg-sand-300" />
                  <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {s.children.map((c) => <div key={c.en} className="rounded-lg border border-sand-200 bg-white px-3 py-2.5 text-center text-sm">{L(c)}</div>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{ar ? "أعضاء اللجنة" : "Committee members"}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMMITTEE.members.map((m, i) => (
            <Card key={i} className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sand-100 text-lg font-bold text-sand-700">{m.real ? L(m.name).split(" ")[0][0] : "?"}</div>
              <div className="min-w-0"><div className={`font-medium ${m.real ? "" : "text-stone-400"}`}>{L(m.name)}</div><div className="text-xs text-stone-500">{L(m.role)}</div></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
