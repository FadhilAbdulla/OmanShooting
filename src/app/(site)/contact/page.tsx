import { getDict } from "@/lib/i18n";
import { CONTACT } from "@/lib/site-content";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { ContactForm } from "./form";

export const metadata = { title: "Contact us · Oman Traditional Shooting" };

/** WEB-06: contact form, official contact details, social accounts and locations. */
export default async function Contact() {
  const { locale } = await getDict();
  const ar = locale === "ar";
  const L = (x: { en: string; ar: string }) => (ar ? x.ar : x.en);
  return (
    <div>
      <PageHeader ar={ar} sample={false} title={ar ? "اتصل بنا" : "Contact us"} intro={ar ? "يسعدنا تواصلك — أرسل رسالتك وسيرد عليك فريق اللجنة." : "We'd love to hear from you — send a message and the Committee team will reply."} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5 sm:p-6"><ContactForm ar={ar} /></Card>
        <aside className="space-y-4">
          <Card className="space-y-3 p-5 text-sm">
            <h2 className="font-semibold">{ar ? "بيانات التواصل الرسمية" : "Official contact details"}</h2>
            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 hover:text-brand-600"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">☎</span><span dir="ltr">{CONTACT.phone}</span></a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 break-all hover:text-brand-600"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">✉</span>{CONTACT.email}</a>
            <div className="flex items-center gap-3 text-stone-600"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">⏰</span>{L(CONTACT.hours)}</div>
            <div className="border-t border-sand-100 pt-3">
              {CONTACT.people.map((p) => (
                <div key={p.phone} className="py-1.5"><div className="font-medium">{L(p.name)}</div><div className="text-xs text-stone-500">{L(p.role)} · <a href={`tel:${p.phone.replace(/\s/g, "")}`} dir="ltr" className="hover:underline">{p.phone}</a></div></div>
              ))}
            </div>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-semibold">{ar ? "حسابات التواصل الاجتماعي" : "Social media"}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Instagram", "X", "YouTube", "WhatsApp"].map((s) => <span key={s} className="rounded-full border border-sand-300 px-3 py-1 text-xs text-stone-600">{s}</span>)}
            </div>
            <p className="mt-2 text-xs text-stone-500">{ar ? "روابط الحسابات الرسمية تُضاف عند تزويدنا بها." : "Official account links will be added once provided by the Committee."}</p>
          </Card>
        </aside>
      </div>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">{ar ? "مواقع اللجنة والميادين" : "Committee & range locations"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CONTACT.locations.map((loc) => (
            <Card key={loc.map} className="overflow-hidden">
              <iframe title={L(loc.name)} src={`https://www.google.com/maps?q=${encodeURIComponent(loc.map)}&output=embed`} className="h-56 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <div className="p-4 text-sm"><div className="font-medium">{L(loc.name)}</div><div className="text-stone-500">{L(loc.address)}</div></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
