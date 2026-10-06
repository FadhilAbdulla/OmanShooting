import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { staffAssign } from "@/lib/booking";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const { civilId, replaceBookingId } = z.object({ civilId: z.string().min(4), replaceBookingId: z.string().optional() }).parse(await req.json());
  await staffAssign((await params).id, civilId.trim(), s.uid, replaceBookingId);
  return ok();
});
