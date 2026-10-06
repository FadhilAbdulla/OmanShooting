import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { cloneEvent } from "@/lib/admin";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { startDate } = z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(await req.json());
  const ev = await cloneEvent((await params).id, startDate, s.uid);
  return ok({ id: ev.id });
});
