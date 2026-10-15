import Link from "next/link";
import { requirePageRole, STAFF } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/nav-client";
import { BottomNav, Icon, type SheetItem, type Tab } from "@/components/bottom-nav";
import { AdminNav, type NavSection } from "./nav";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrator", JUDGE: "Judge", RECEPTION: "Reception" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePageRole(STAFF, "/admin");
  const can = (roles: string[]) => roles.some((r) => s.roles.includes(r));
  const pending = can(["ADMIN", "RECEPTION"])
    ? await prisma.order.count({ where: { status: { in: ["PENDING_CASH", "PENDING_REVIEW"] } } })
    : 0;

  // Championship-day tools first: they are what staff reach for most, on phones and at the range
  const sections: NavSection[] = [
    { items: [{ href: "/admin", label: "Dashboard", short: "Home", icon: "dash", roles: ["ADMIN", "RECEPTION", "JUDGE"] }] },
    { title: "Championship day", items: [
      { href: "/admin/checkin", label: "Check-in", short: "Check-in", icon: "check", roles: ["ADMIN", "RECEPTION", "JUDGE"] },
      { href: "/admin/scoring", label: "Scoring & results", short: "Scoring", icon: "star", roles: ["ADMIN", "JUDGE"] },
    ] },
    { title: "Manage", items: [
      { href: "/admin/events", label: "Events & competitions", short: "Events", icon: "target", roles: ["ADMIN"] },
      { href: "/admin/payments", label: "Payments", short: "Payments", icon: "card", roles: ["ADMIN", "RECEPTION"], badge: pending },
      { href: "/admin/users", label: "Shooters", short: "Shooters", icon: "users", roles: ["ADMIN"] },
      { href: "/admin/messages", label: "Contact messages", short: "Messages", icon: "list", roles: ["ADMIN", "RECEPTION"] },
    ] },
    { title: "System", items: [
      { href: "/admin/staff", label: "Staff logins", short: "Staff", icon: "shield", roles: ["ADMIN"] },
      { href: "/admin/audit", label: "Audit log", short: "Audit", icon: "list", roles: ["ADMIN"] },
    ] },
  ]
    .map((section) => ({ ...section, items: section.items.filter((i) => can(i.roles)) }))
    .filter((section) => section.items.length);

  const items = sections.flatMap((section) => section.items);
  const role = s.roles.filter((r) => r !== "SHOOTER").map((r) => ROLE_LABEL[r] ?? r).join(" · ");
  const initials = s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  // Phones/tablets: first four sections as tabs, the rest (plus site link and sign-out) in "More"
  const tabs: Tab[] = items.slice(0, 4).map((i) => ({ href: i.href, label: i.short, icon: i.icon, badge: i.badge || undefined, prefixes: i.href === "/admin" ? undefined : [i.href] }));
  const more: SheetItem[] = [
    ...items.slice(4).map((i) => ({ label: i.badge ? `${i.label} (${i.badge})` : i.label, icon: i.icon, href: i.href })),
    { label: "My account", icon: "user", href: "/admin/account" },
    { label: "View public site", icon: "home", href: "/" },
    { label: "Sign out", icon: "logout", action: "logout" as const },
  ];

  return (
    <div dir="ltr" className="min-h-screen bg-stone-50 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Desktop: fixed light sidebar. Phones/tablets: compact top bar + bottom tab bar */}
      <aside className="sticky top-0 z-30 border-b border-stone-200 bg-white no-print lg:fixed lg:inset-y-0 lg:start-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 lg:px-5 lg:py-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 lg:h-9 lg:w-9" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-stone-900">Committee Console</span>
              <span className="block text-[11px] text-stone-500">Oman Traditional Shooting</span>
            </span>
          </Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 lg:hidden" title={`${s.name} · ${role}`}>{initials}</span>
        </div>
        <div className="hidden lg:block lg:flex-1 lg:overflow-y-auto">
          <AdminNav sections={sections} />
        </div>
        <div className="hidden border-t border-stone-200 p-3 lg:block">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">{initials}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-stone-900">{s.name}</span>
              <span className="block truncate text-xs text-stone-500">{role}</span>
            </span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            <Link href="/admin/account" className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-100 hover:text-stone-900">
              <Icon name="user" className="h-3.5 w-3.5" />Account
            </Link>
            <Link href="/" className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-100 hover:text-stone-900">
              <Icon name="external" className="h-3.5 w-3.5" />Site
            </Link>
            <LogoutButton label="Sign out" to="/staff/login" className="rounded-md px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-100 hover:text-stone-900" />
          </div>
        </div>
      </aside>
      <div className="lg:ps-64">
        <main className="mx-auto min-w-0 max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <BottomNav tabs={tabs} more={more} wide logoutTo="/staff/login" />
    </div>
  );
}
