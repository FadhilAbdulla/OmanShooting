import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { PRESETS, type PresetKey } from "@/lib/admin";
import { CompBody } from "@/lib/schemas";

const Create = z.object({ eventId: z.string(), parentId: z.string().optional().nullable(), preset: z.string().optional(), data: CompBody.partial().optional() });

export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(["ADMIN"]);
  const { eventId, parentId, preset, data } = Create.parse(await req.json());
  const parent = parentId ? await prisma.competition.findUniqueOrThrow({ where: { id: parentId } }) : null;
  const p = preset && preset in PRESETS ? PRESETS[preset as PresetKey] : null;
  const base = parent
    ? { firearm: parent.firearm, genderRule: parent.genderRule, minAge: parent.minAge, maxAge: parent.maxAge, format: parent.format, teamSize: parent.teamSize,
        shotsPerSeries: parent.shotsPerSeries, seriesCount: parent.seriesCount, venueType: parent.venueType, targetsPerGroup: parent.targetsPerGroup,
        leftHandTargets: parent.leftHandTargets, enforceHand: parent.enforceHand, prices: parent.prices.map(Number), finalistsCount: parent.finalistsCount,
        nameEn: `${parent.nameEn} — Sub`, nameAr: `${parent.nameAr} — فرعي` }
    : p
      ? { nameEn: p.nameEn, nameAr: p.nameAr, format: p.format, teamSize: "teamSize" in p ? p.teamSize : null, shotsPerSeries: p.shotsPerSeries,
          seriesCount: p.seriesCount, targetsPerGroup: p.targetsPerGroup, prices: [...p.prices], leftHandTargets: [1] }
      : {};
  const order = await prisma.competition.count({ where: { eventId, parentId: parentId ?? null } });
  const c = await prisma.competition.create({ data: { ...(base as object), ...(data ?? {}), eventId, parentId: parentId ?? null, sortOrder: order } as never });
  await audit(s.uid, "competition.create", "Competition", c.id, { preset: preset ?? null });
  return ok({ id: c.id });
});
