import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { generateFinals } from "@/lib/scoring";
import { muscatDateTime } from "@/lib/utils";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN", "JUDGE"]);
  const { date, time } = z.object({ date: z.string(), time: z.string() }).parse(await req.json());
  await generateFinals((await params).id, muscatDateTime(date, time), s.uid);
  return ok();
});
