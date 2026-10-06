import { z } from "zod";
import { requireApiRole, STAFF } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { moveBooking } from "@/lib/booking";
import { prisma } from "@/lib/db";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(null);
  const { slotId, asStaff } = z.object({ slotId: z.string(), asStaff: z.boolean().optional() }).parse(await req.json());
  const staff = (await prisma.userRole.count({ where: { userId: s.uid, role: { in: STAFF as never[] } } })) > 0;
  await moveBooking((await params).id, slotId, s.uid, staff && !!asStaff);
  return ok();
});
