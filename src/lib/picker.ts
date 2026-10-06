import { prisma } from "./db";
import { isoDate } from "./utils";

export type PickerData = {
  events: { id: string; name: string; isTest: boolean; comps: { id: string; name: string; groups: { id: string; label: string; date: string; startsAt: string; isFinal: boolean }[] }[] }[];
  defaultGroupId: string | null;
};

/** Event → competition → group tree for the check-in and scoring screens, with a smart default group. */
export async function pickerData(requested?: string | null): Promise<PickerData> {
  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    orderBy: { startDate: "asc" },
    include: { competitions: { orderBy: { sortOrder: "asc" }, include: { children: { select: { id: true } }, groups: { orderBy: { startsAt: "asc" } } } } },
  });
  const now = Date.now();
  let best: { id: string; dist: number } | null = null;
  const data = events.map((e) => ({
    id: e.id, name: e.nameEn, isTest: e.status === "DRAFT",
    comps: e.competitions.filter((c) => !c.children.length).map((c) => ({
      id: c.id, name: c.nameEn,
      groups: c.groups.map((g) => {
        // Default = the group running now, otherwise the next to start (live events preferred)
        const running = g.startsAt.getTime() <= now && g.endsAt.getTime() >= now;
        const dist = running ? -1 : g.startsAt.getTime() >= now ? g.startsAt.getTime() - now : Infinity;
        const score = dist + (e.status === "DRAFT" ? 1e12 : 0);
        if (!best || score < best.dist) best = { id: g.id, dist: score };
        return { id: g.id, label: g.label, date: isoDate(g.date), startsAt: g.startsAt.toISOString(), isFinal: g.isFinal };
      }),
    })),
  }));
  const fallback = data[0]?.comps[0]?.groups[0]?.id ?? null;
  return { events: data, defaultGroupId: requested || (best as { id: string } | null)?.id || fallback };
}
