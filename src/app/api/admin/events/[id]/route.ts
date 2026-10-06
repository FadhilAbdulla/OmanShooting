import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/utils";
import { EventBody, eventData } from "@/lib/schemas";

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const d = EventBody.parse(await req.json());
  await prisma.event.update({ where: { id }, data: eventData(d) });
  await audit(s.uid, "event.update", "Event", id);
  return ok();
});

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const ev = await prisma.event.findUniqueOrThrow({ where: { id } });
  if (ev.status !== "DRAFT") throw new AppError("Only draft events can be deleted", 409);
  await prisma.booking.deleteMany({ where: { competition: { eventId: id } } });
  await prisma.event.delete({ where: { id } });
  await audit(s.uid, "event.delete", "Event", id, { slug: ev.slug });
  return ok();
});
