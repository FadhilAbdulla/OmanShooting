import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { channels, publish } from "@/lib/realtime";
import { AppError } from "@/lib/utils";
import { parseMemberToken } from "@/lib/member";

/**
 * Check-in by scan or typing. Accepts: QR URL (…/verify/M123), member no "M123", civil ID, or participant no "#12".
 * Finds the shooter's confirmed booking in the selected group (or today's next group in the event) and marks PRESENT.
 */
export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const { code, groupId, eventId } = z.object({ code: z.string().min(1), groupId: z.string().optional(), eventId: z.string().optional() }).parse(await req.json());
  const raw = code.trim();
  const signed = parseMemberToken(raw);
  const m = signed ? null : raw.match(/^M(\d+)$/i); // staff may also type a bare member number
  const p = raw.match(/^#(\d+)$/);

  let userWhere: object;
  if (signed) userWhere = { user: { memberNo: signed } };
  else if (raw.match(/M\d+\./i)) throw new AppError("Invalid or tampered membership QR", 400);
  else if (m) userWhere = { user: { memberNo: Number(m[1]) } };
  else if (p) userWhere = { participantNo: Number(p[1]) };
  else userWhere = { user: { civilId: raw.replace(/\D/g, "") } };

  const find = (scope: object) => prisma.booking.findMany({
    where: { ...userWhere, ...scope, status: "CONFIRMED" as const },
    include: { user: true, group: true, competition: true }, orderBy: { group: { startsAt: "asc" } },
  });
  let candidates = await find(groupId ? { groupId } : eventId ? { competition: { eventId } } : {});
  let otherGroup = false;
  // Not in the selected group? Look across the whole event so the desk can redirect the shooter.
  if (!candidates.length && groupId && eventId) {
    candidates = await find({ competition: { eventId } });
    otherGroup = candidates.length > 0;
  }
  if (!candidates.length) {
    const any = await prisma.booking.findFirst({ where: { ...userWhere, status: "PENDING_PAYMENT", ...(eventId ? { competition: { eventId } } : {}) }, include: { order: true } });
    if (any) throw new AppError(`Payment pending (${any.order?.method?.replace("_", " ")}) — collect payment first`, 402, "UNPAID");
    throw new AppError("No confirmed booking found for this shooter", 404);
  }
  // Prefer the next group that hasn't finished yet
  const now = Date.now();
  const b = candidates.find((c) => c.group.endsAt.getTime() > now - 3_600_000) ?? candidates[candidates.length - 1];
  const already = b.attendance === "PRESENT";
  if (!already) {
    await prisma.booking.update({ where: { id: b.id }, data: { attendance: "PRESENT", checkedInAt: new Date(), checkedInBy: s.uid } });
    await publish(channels.group(b.groupId), { type: "attendance" });
  }
  return ok({
    already, otherGroup, groupId: b.groupId, bookingId: b.id, name: b.user.fullName, photo: b.user.photo, targetNo: b.targetNo, participantNo: b.participantNo,
    group: b.group.label, startsAt: b.group.startsAt, competition: b.competition.nameEn, hand: b.user.hand,
  });
});
