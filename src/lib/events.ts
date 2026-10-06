import type { Event } from "@prisma/client";

export type Badge = "DRAFT" | "COMING_SOON" | "OPEN" | "CLOSED";

/** TOUR-05 status badges are derived — admins never have to flip them by hand. */
export function eventBadge(e: Pick<Event, "status" | "regOpensAt" | "regClosesAt">, now = new Date()): Badge {
  if (e.status === "DRAFT") return "DRAFT";
  if (e.status === "CLOSED") return "CLOSED";
  if (now < e.regOpensAt) return "COMING_SOON";
  if (now > e.regClosesAt) return "CLOSED";
  return "OPEN";
}

export const badgeStyle: Record<Badge, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  COMING_SOON: "bg-amber-100 text-amber-800",
  OPEN: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-rose-100 text-rose-800",
};

export const venueLabel = { INDOOR_AC: "Indoor · A/C", INDOOR: "Indoor", OUTDOOR: "Outdoor" } as const;
export const genderLabel = { MALE: "Men", FEMALE: "Women", ANY: "Open" } as const;
