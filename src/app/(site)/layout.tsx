import Link from "next/link";
import { getSession, STAFF } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { LocaleToggle, LogoutButton } from "@/components/nav-client";
import { Logo } from "@/components/logo";
import { DemoBanner } from "@/components/demo-banner";
import { prisma } from "@/lib/db";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const { t, locale } = await getDict();
  const staff = s?.roles.some((r) => STAFF.includes(r));
  const ar = locale === "ar";
  // Live holds in the cart, so a shooter always knows they have something waiting to be paid
  const cartCount = s ? await prisma.slot.count({ where: { userId: s.uid, state: "HELD", holdExpiresAt: { gt: new Date() } } }) : 0;
  return (
    <>
      <DemoBanner />
      <header className="heritage-bg sticky top-0 z-40 border-b border-white/10 text-sand-100 shadow-sm no-print">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <Logo className="h-9 w-9" />
            <span className="hidden leading-tight sm:block">
              {t.brand}
              <span className="block text-[11px] font-normal text-sand-300">{ar ? "Oman Traditional Shooting" : "الرماية التقليدية العُمانية"}</span>
            </span>
          </Link>
          <nav className="ms-auto flex items-center gap-1 text-sm">
            <Link href="/#championships" className="hidden rounded-md px-3 py-1.5 hover:bg-white/10 sm:block">{t.events}</Link>
            {s && (
              <Link href="/cart" className="relative rounded-md px-3 py-1.5 hover:bg-white/10">
                {t.cart}
                {cartCount > 0 && <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950">{cartCount}</span>}
              </Link>
            )}
            {s && <Link href="/me" className="rounded-md px-3 py-1.5 hover:bg-white/10">{t.my}</Link>}
            {staff && <Link href="/admin" className="rounded-md bg-white/15 px-3 py-1.5 hover:bg-white/20">{t.admin}</Link>}
            <LocaleToggle locale={locale} />
            {s ? <LogoutButton label={t.logout} /> : <Link href="/login" className="ms-1 rounded-lg bg-brand-500 px-4 py-2 font-medium text-white shadow hover:bg-brand-600">{t.login}</Link>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="heritage-bg mt-6 text-sand-200 no-print">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 font-semibold text-white"><Logo className="h-9 w-9" />{t.brand}</div>
            <p className="mt-4 max-w-sm text-sm text-sand-300">
              {ar
                ? "المنصة الوطنية للجنة العُمانية للرماية بالأسلحة التقليدية — لتنظيم البطولات وتوثيق الموروث للأجيال القادمة."
                : "The national platform of the Oman Committee for Traditional Shooting with Traditional Weapons — organising championships and preserving our heritage for future generations."}
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{ar ? "روابط" : "Explore"}</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/#championships" className="hover:text-white">{t.events}</Link></li>
              <li><Link href="/login" className="hover:text-white">{ar ? "العضوية" : "Membership"}</Link></li>
              <li><Link href="/me" className="hover:text-white">{t.my}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{ar ? "تواصل معنا" : "Contact"}</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="mailto:omanshooter@mcsy.gov.om" className="hover:text-white">omanshooter@mcsy.gov.om</a></li>
              <li dir="ltr" className="text-start"><a href="tel:+96892661818" className="hover:text-white">+968 9266 1818</a></li>
              <li>{ar ? "مسقط، سلطنة عُمان" : "Muscat, Sultanate of Oman"}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-sand-300">
            <span>© {new Date().getFullYear()} {ar ? "اللجنة العُمانية للرماية بالأسلحة التقليدية" : "Oman Committee for Traditional Shooting with Traditional Weapons"}</span>
            <span>{ar ? "الصور: Unsplash" : "Photography: Unsplash contributors"}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
