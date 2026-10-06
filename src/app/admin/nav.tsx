"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const p = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3 lg:pb-4">
      {items.map((i) => {
        const active = i.href === "/admin" ? p === "/admin" : p.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-white/15 font-medium text-white shadow-inner" : "text-sand-200 hover:bg-white/10 hover:text-white")}>
            <span aria-hidden className={cn("w-4 text-center", active ? "text-sand-100" : "text-sand-300")}>{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
