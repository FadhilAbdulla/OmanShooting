"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/bottom-nav";

export type NavItem = { href: string; label: string; short: string; icon: string; roles: string[]; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

export function AdminNav({ sections }: { sections: NavSection[] }) {
  const p = usePathname();
  return (
    <nav className="space-y-5 px-3 pb-4">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{section.title}</div>}
          <div className="space-y-0.5">
            {section.items.map((i) => {
              const active = i.href === "/admin" ? p === "/admin" : p.startsWith(i.href);
              return (
                <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
                  className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900")}>
                  <Icon name={i.icon} className={cn("h-5 w-5", active ? "text-brand-600" : "text-stone-400 group-hover:text-stone-600")} />
                  <span className="flex-1">{i.label}</span>
                  {!!i.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 tabular">{i.badge}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
