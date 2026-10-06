import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

/** Live roster for a group: every target with its booking (if any), shooter, payment and attendance. */
export const GET = handle(async (req: Request) => {
  await requireApiRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const groupId = new URL(req.url).searchParams.get("groupId")!;
  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId }, include: { competition: true } });
  const slots = await prisma.slot.findMany({
    where: { groupId }, orderBy: { targetNo: "asc" },
    include: { bookings: { where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } }, include: { user: true, order: true } } },
  });
  const now = Date.now();
  return ok({
    group: { id: group.id, label: group.label, startsAt: group.startsAt, endsAt: group.endsAt, isFinal: group.isFinal, competition: group.competition.nameEn, locked: !!group.competition.resultsLockedAt },
    slots: slots.map((s) => {
      const b = s.bookings[0];
      const expired = (s.state === "HELD" || s.state === "PENDING") && s.holdExpiresAt && s.holdExpiresAt.getTime() < now;
      return {
        id: s.id, targetNo: s.targetNo, isLeftHand: s.isLeftHand, state: expired ? "FREE" : s.state,
        booking: b ? {
          id: b.id, status: b.status, attendance: b.attendance, participantNo: b.participantNo, checkedInAt: b.checkedInAt, hasScore: b.total != null,
          user: { name: b.user.fullName, civilId: b.user.civilId, memberNo: b.user.memberNo, hand: b.user.hand, photo: b.user.photo, mobile: b.user.mobile },
          order: b.order ? { id: b.order.id, status: b.order.status, method: b.order.method, total: b.order.total.toString(), receipt: !!b.order.receipt } : null,
        } : null,
      };
    }),
  });
});
