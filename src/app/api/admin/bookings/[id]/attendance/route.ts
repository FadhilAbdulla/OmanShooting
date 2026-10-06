import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { channels, publish } from "@/lib/realtime";
import { AppError } from "@/lib/utils";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const { attendance } = z.object({ attendance: z.enum(["PRESENT", "ABSENT", "UNKNOWN"]) }).parse(await req.json());
  const id = (await params).id;
  const b = await prisma.booking.findUniqueOrThrow({ where: { id } });
  if (b.status !== "CONFIRMED") throw new AppError("Booking is not confirmed — collect payment first", 409);
  if (attendance !== "PRESENT" && b.total != null) throw new AppError("Shooter already has a score", 409);
  await prisma.booking.update({
    where: { id },
    data: { attendance, checkedInAt: attendance === "PRESENT" ? new Date() : null, checkedInBy: attendance === "PRESENT" ? s.uid : null },
  });
  await publish(channels.group(b.groupId), { type: "attendance" });
  return ok();
});
