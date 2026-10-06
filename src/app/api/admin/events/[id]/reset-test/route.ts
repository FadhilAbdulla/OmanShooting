import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { resetTestData } from "@/lib/admin";
import { AppError } from "@/lib/utils";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const ev = await prisma.event.findUniqueOrThrow({ where: { id } });
  if (ev.status !== "DRAFT") throw new AppError("Test data can only be reset on draft events", 409);
  return ok({ removed: await resetTestData(id, s.uid) });
});
