import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { channels, publish } from "@/lib/realtime";

/** One click at group start: everyone not yet checked in is marked absent (targets become replaceable). */
export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const { groupId } = z.object({ groupId: z.string() }).parse(await req.json());
  const r = await prisma.booking.updateMany({ where: { groupId, status: "CONFIRMED", attendance: "UNKNOWN", total: null }, data: { attendance: "ABSENT" } });
  await audit(s.uid, "attendance.bulkAbsent", "Group", groupId, { count: r.count });
  await publish(channels.group(groupId), { type: "attendance" });
  return ok({ count: r.count });
});
