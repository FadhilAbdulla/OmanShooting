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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 font-semibold text-white"><Logo className="h-8 w-8" />{t.brand}</div>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/#championships" className="hover:text-white">{t.events}</Link>
            <Link href="/login" className="hover:text-white">{ar ? "العضوية" : "Membership"}</Link>
            <Link href="/me" className="hover:text-white">{t.my}</Link>
          </nav>
          <div className="text-xs text-sand-300">© {new Date().getFullYear()} {ar ? "اللجنة العُمانية للرماية" : "Oman Traditional Shooting"}</div>
        </div>
      </footer>
    </>
  );
}
