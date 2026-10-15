import type { VenueType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Icon } from "./bottom-nav";

/** One colour + icon per range type so groups can be told apart at a glance (cool / covered / open air). */
export const VENUE: Record<VenueType, { label: string; short: string; icon: string; chip: string; accent: string; dot: string }> = {
  INDOOR_AC: { label: "Indoor · Air-conditioned", short: "Indoor A/C", icon: "snow", chip: "bg-cyan-50 text-cyan-800 ring-cyan-200", accent: "border-s-cyan-500", dot: "bg-cyan-500" },
  INDOOR: { label: "Indoor · Not air-conditioned", short: "Indoor", icon: "building", chip: "bg-violet-50 text-violet-800 ring-violet-200", accent: "border-s-violet-500", dot: "bg-violet-500" },
  OUTDOOR: { label: "Outdoor", short: "Outdoor", icon: "sun", chip: "bg-orange-50 text-orange-800 ring-orange-200", accent: "border-s-orange-500", dot: "bg-orange-500" },
};

export function VenueBadge({ type, short = false, className }: { type: VenueType; short?: boolean; className?: string }) {
  const v = VENUE[type];
  return (
    <span title={v.label} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", v.chip, className)}>
      <Icon name={v.icon} className="h-3.5 w-3.5" />
      {short ? v.short : v.label}
    </span>
  );
}

export function VenueLegend({ types, className }: { types?: VenueType[]; className?: string }) {
  const list = types ?? (Object.keys(VENUE) as VenueType[]);
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs text-stone-600", className)}>
      {list.map((t) => <VenueBadge key={t} type={t} />)}
    </div>
  );
}

/** "18 of 24 places left" with a fill bar — shared by the public and admin views. */
export function Places({ left, total, className }: { left: number; total: number; className?: string }) {
  const pct = total ? Math.round(((total - left) / total) * 100) : 0;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs tabular">
        <span className={cn("font-semibold", !left ? "text-rose-600" : left <= Math.max(2, total * 0.2) ? "text-amber-700" : "text-oasis-600")}>
          {left ? `${left} left` : "Full"}
        </span>
        <span className="text-stone-500">{total} targets</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full", !left ? "bg-rose-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
