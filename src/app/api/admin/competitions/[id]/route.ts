import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/utils";
import { CompBody } from "@/lib/schemas";

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const body = await req.json();
  const d = CompBody.parse(body);
  const before = await prisma.competition.findUniqueOrThrow({ where: { id } });
  await prisma.competition.update({ where: { id }, data: d });
  // Keep generated target rows in sync with left-hand configuration
  if (JSON.stringify(before.leftHandTargets) !== JSON.stringify(d.leftHandTargets)) {
    await prisma.slot.updateMany({ where: { group: { competitionId: id }, state: "FREE" }, data: { isLeftHand: false } });
    await prisma.slot.updateMany({ where: { group: { competitionId: id }, state: "FREE", targetNo: { in: d.leftHandTargets } }, data: { isLeftHand: true } });
  }
  // Optional: push shared settings down to sub-competitions in one go
  if (body.applyToChildren) {
    const { nameEn: _n, nameAr: _a, genderRule: _g, minAge: _mi, maxAge: _ma, ...shared } = d;
    void _n; void _a; void _g; void _mi; void _ma;
    await prisma.competition.updateMany({ where: { parentId: id }, data: shared });
  }
  await audit(s.uid, "competition.update", "Competition", id);
  return ok();
});

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const live = await prisma.booking.count({ where: { OR: [{ competitionId: id }, { competition: { parentId: id } }], isTest: false, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } } });
  if (live) throw new AppError("Competition has live bookings", 409);
  await prisma.booking.deleteMany({ where: { OR: [{ competitionId: id }, { competition: { parentId: id } }] } });
  await prisma.competition.delete({ where: { id } });
  await audit(s.uid, "competition.delete", "Competition", id);
  return ok();
});
