import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { generateMatrix } from "@/lib/admin";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { genders, bands } = z.object({
    genders: z.array(z.enum(["MALE", "FEMALE"])).min(1),
    bands: z.array(z.enum(["U18", "18-39", "40+", "OPEN"])).min(1),
  }).parse(await req.json());
  const created = await generateMatrix((await params).id, genders, bands, s.uid);
  return ok({ created: created.length });
});
