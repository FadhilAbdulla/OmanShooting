import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { createSchedule, previewSchedule } from "@/lib/admin";

const Body = z.object({
  competitionIds: z.array(z.string()).min(1, "Pick at least one competition"),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1, "Pick at least one date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(5).max(600), gapMin: z.coerce.number().int().min(0).max(240),
  targets: z.coerce.number().int().min(1).max(100).nullable().optional(),
  preview: z.boolean().optional(),
});

export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(["ADMIN"]);
  const d = Body.parse(await req.json());
  if (d.preview) return ok({ preview: previewSchedule(d) });
  return ok(await createSchedule(d, s.uid));
});
