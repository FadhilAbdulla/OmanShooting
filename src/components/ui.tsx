import { cn } from "@/lib/utils";
import Link from "next/link";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "success"; size?: "sm" | "md" | "lg" };

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-200",
  secondary: "bg-white text-stone-800 border border-sand-300 hover:bg-sand-100 disabled:opacity-50",
  ghost: "text-stone-700 hover:bg-sand-100 disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50",
  success: "bg-oasis-500 text-white hover:bg-oasis-600 disabled:opacity-50",
};
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed", variants[variant], sizes[size], className)} />;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: BtnProps["variant"]; size?: BtnProps["size"]; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors", variants[variant], sizes[size], className)}>{children}</Link>;
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("rounded-xl border border-sand-200 bg-white shadow-sm", className)} />;
}

export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...p} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", className)} />;
}

export const inputCls = "h-10 w-full rounded-lg border border-sand-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-sand-300 p-8 text-center text-sm text-stone-500">{children}</div>;
}
