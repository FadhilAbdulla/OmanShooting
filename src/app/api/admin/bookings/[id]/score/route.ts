import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { saveScore } from "@/lib/scoring";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN", "JUDGE"]);
  const { series, xCount } = z.object({ series: z.array(z.number().int()), xCount: z.number().int().min(0).nullable().optional() }).parse(await req.json());
  await saveScore((await params).id, series, xCount ?? null, s.uid);
  return ok();
});
