import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { channels, publish } from "@/lib/realtime";
import { AppError } from "@/lib/utils";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const slot = await prisma.slot.findUniqueOrThrow({ where: { id } });
  if (slot.state === "BLOCKED") await prisma.slot.update({ where: { id }, data: { state: "FREE" } });
  else {
    const r = await prisma.slot.updateMany({
      where: { id, OR: [{ state: "FREE" }, { state: "HELD", holdExpiresAt: { lt: new Date() } }] },
      data: { state: "BLOCKED", userId: null, holdExpiresAt: null },
    });
    if (!r.count) throw new AppError("Target is in use", 409);
  }
  await publish(channels.group(slot.groupId));
  return ok();
});
