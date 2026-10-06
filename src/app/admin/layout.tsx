import Link from "next/link";
import { requirePageRole, STAFF } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/nav-client";
import { DemoBanner } from "@/components/demo-banner";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePageRole(STAFF, "/admin");
  const items = [
    { href: "/admin", label: "Dashboard", icon: "▦", roles: ["ADMIN", "RECEPTION", "JUDGE"] },
    { href: "/admin/events", label: "Events & competitions", icon: "◎", roles: ["ADMIN"] },
    { href: "/admin/checkin", label: "Attendance / check-in", icon: "✓", roles: ["ADMIN", "RECEPTION", "JUDGE"] },
    { href: "/admin/scoring", label: "Scoring & results", icon: "★", roles: ["ADMIN", "JUDGE"] },
    { href: "/admin/payments", label: "Payments", icon: "◈", roles: ["ADMIN", "RECEPTION"] },
    { href: "/admin/users", label: "Members & roles", icon: "◉", roles: ["ADMIN"] },
    { href: "/admin/audit", label: "Audit log", icon: "≡", roles: ["ADMIN"] },
  ].filter((i) => i.roles.some((r) => s.roles.includes(r)));

  return (
    <div dir="ltr" className="min-h-screen">
      {/* Sidebar: fixed on desktop (scrolls independently), sticky top bar on mobile */}
      <aside className="heritage-bg sticky top-0 z-30 text-sand-100 no-print lg:fixed lg:inset-y-0 lg:start-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 lg:py-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo />
            <span className="leading-tight">Committee Admin<span className="block text-[11px] font-normal text-sand-300">Traditional Shooting</span></span>
          </Link>
          <div className="lg:hidden"><LogoutButton label="Sign out" /></div>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto">
          <AdminNav items={items} />
        </div>
        <div className="hidden border-t border-white/10 p-4 text-xs text-sand-300 lg:block">
          <div className="text-sand-100 font-medium">{s.name}</div>
          <div className="mb-2">{s.roles.filter((r) => r !== "SHOOTER").join(" · ")}</div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-md px-2 py-1 hover:bg-white/10">View site ↗</Link>
            <LogoutButton label="Sign out" />
          </div>
        </div>
      </aside>
      <div className="lg:ps-64">
        <DemoBanner />
        <main className="min-w-0 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
