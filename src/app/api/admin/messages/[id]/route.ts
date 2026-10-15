import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN", "RECEPTION"]);
  const { id } = await params;
  await prisma.contactMessage.update({ where: { id }, data: { handledAt: new Date() } });
  await audit(s.uid, "contact.handled", "ContactMessage", id);
  return ok();
});
