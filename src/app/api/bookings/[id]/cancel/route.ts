import { requireApiRole, STAFF } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { cancelBooking } from "@/lib/booking";
import { prisma } from "@/lib/db";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(null);
  const body = await req.json().catch(() => ({}));
  const staff = (await prisma.userRole.count({ where: { userId: s.uid, role: { in: STAFF as never[] } } })) > 0;
  await cancelBooking((await params).id, s.uid, staff && body.asStaff === true, body.reason);
  return ok();
});
