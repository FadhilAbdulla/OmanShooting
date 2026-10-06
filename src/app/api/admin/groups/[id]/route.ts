import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/utils";

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const live = await prisma.booking.count({ where: { groupId: id, isTest: false, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } } });
  if (live) throw new AppError("Group has bookings — move or cancel them first", 409);
  await prisma.booking.deleteMany({ where: { groupId: id } });
  await prisma.group.delete({ where: { id } });
  await audit(s.uid, "group.delete", "Group", id);
  return ok();
});
