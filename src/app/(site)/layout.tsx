import Link from "next/link";
import { cookies } from "next/headers";
import { getSession, STAFF } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { LocaleToggle, LogoutButton } from "@/components/nav-client";
import { Logo } from "@/components/logo";
import { BottomNav, type SheetItem, type Tab } from "@/components/bottom-nav";
import { prisma } from "@/lib/db";
import { INFO_PAGES } from "@/lib/site-content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const { t, locale } = await getDict();
  const staff = s?.roles.some((r) => STAFF.includes(r));
  const ar = locale === "ar";
  // Live holds in the cart, so a shooter always knows they have something waiting to be paid
  // Between OTP verification and finishing onboarding the visitor has a "reg" cookie but no session yet
  const onboarding = !s && !!(await cookies()).get("reg")?.value;
  const cartCount = s ? await prisma.slot.count({ where: { userId: s.uid, state: "HELD", holdExpiresAt: { gt: new Date() } } }) : 0;
  // Phone tab bar (app-style); desktop keeps the header navigation
  const L = ar
    ? { home: "الرئيسية", events: "البطولات", bookings: "حجوزاتي", cart: "السلة", signIn: "دخول", lang: "English", admin: "لوحة الإدارة", logout: "تسجيل الخروج" }
    : { home: "Home", events: "Championships", bookings: "Bookings", cart: "Cart", signIn: "Sign in", lang: "العربية", admin: "Admin panel", logout: "Sign out" };
  const tabs: Tab[] = s
    ? [
        { href: "/", label: L.home, icon: "home" },
        { href: "/events", label: L.events, icon: "target", prefixes: ["/events", "/results"] },
        { href: "/me", label: L.bookings, icon: "ticket", prefixes: ["/me", "/orders", "/welcome"] },
        { href: "/cart", label: L.cart, icon: "cart", badge: cartCount, prefixes: ["/cart", "/pay"] },
      ]
    : [
        { href: "/", label: L.home, icon: "home" },
        { href: "/events", label: L.events, icon: "target", prefixes: ["/events", "/results"] },
        { href: "/login", label: L.signIn, icon: "login", prefixes: ["/login", "/signup", "/register"] },
      ];
  // Information pages live in the footer on desktop; on phones (no footer) they sit in the "More" sheet
  const infoIcons = ["shield", "list", "ticket", "star", "home", "user"];
  const more: SheetItem[] = [
    ...(s ? [{ label: ar ? "ملفي الشخصي" : "My profile", icon: "user", href: "/profile" }] : []),
    ...INFO_PAGES.map((p, i) => ({ label: ar ? p.label.ar : p.label.en, icon: infoIcons[i], href: p.href })),
    { label: L.lang, icon: "globe", action: "locale" },
    ...(staff ? [{ label: L.admin, icon: "dash", href: "/admin" }] : []),
    ...(s ? [{ label: L.logout, icon: "logout", action: "logout" as const }] : []),
  ];

  return (
    // Full-height column so the footer always sits at the bottom, even on short pages
    <div className="flex min-h-screen flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="heritage-bg sticky top-0 z-40 border-b border-white/10 text-sand-100 shadow-sm no-print">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <Logo className="h-9 w-9" />
            <span className="leading-tight">
              {t.brand}
              <span className="block text-[11px] font-normal text-sand-300">{ar ? "Oman Traditional Shooting" : "الرماية التقليدية العُمانية"}</span>
            </span>
          </Link>
          {onboarding && <span className="ms-auto rounded-lg bg-white/10 px-3 py-1.5 text-xs text-sand-200 md:hidden">{ar ? "استكمال العضوية" : "Completing membership"}</span>}
          <nav className="ms-auto hidden items-center gap-1 text-sm md:flex">
            {s && (
              <Link href="/cart" className="relative rounded-md px-3 py-1.5 hover:bg-white/10">
                {t.cart}
                {cartCount > 0 && <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950">{cartCount}</span>}
              </Link>
            )}
            {s && <Link href="/me" className="rounded-md px-3 py-1.5 hover:bg-white/10">{t.my}</Link>}
            {s && <Link href="/profile" className="rounded-md px-3 py-1.5 hover:bg-white/10">{ar ? "ملفي" : "Profile"}</Link>}
            {staff && <Link href="/admin" className="rounded-md bg-white/15 px-3 py-1.5 hover:bg-white/20">{t.admin}</Link>}
            <LocaleToggle locale={locale} />
            {s ? <LogoutButton label={t.logout} />
              : onboarding ? <span className="ms-1 rounded-lg bg-white/10 px-3 py-1.5 text-sand-200">{ar ? "استكمال العضوية" : "Completing membership"}</span>
              : <>
                  <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-white/10">{t.login}</Link>
                  <Link href="/signup" className="ms-1 rounded-lg bg-brand-500 px-4 py-2 font-medium text-white shadow hover:bg-brand-600">{ar ? "سجّل عضويتك" : "Sign up"}</Link>
                </>}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <BottomNav tabs={tabs} more={more} locale={locale} />
      <footer className="heritage-bg mt-6 hidden text-sand-200 no-print md:block">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:gap-10">
          <div className="flex items-center gap-2.5 font-semibold text-white"><Logo className="h-8 w-8" />{t.brand}</div>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/events" className="hover:text-white">{t.events}</Link>
            <Link href="/signup" className="hover:text-white">{ar ? "العضوية" : "Membership"}</Link>
            <Link href="/me" className="hover:text-white">{t.my}</Link>
            <Link href="/staff/login" className="hover:text-white">{ar ? "دخول الموظفين" : "Staff sign-in"}</Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-4 text-sm text-sand-300" aria-label={ar ? "معلومات" : "Information"}>
            {INFO_PAGES.map((p) => <Link key={p.href} href={p.href} className="hover:text-white">{ar ? p.label.ar : p.label.en}</Link>)}
          </nav>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-sand-300">
          © {new Date().getFullYear()} {ar ? "اللجنة العُمانية للرماية" : "Oman Traditional Shooting"}
        </div>
      </footer>
    </div>
  );
}
