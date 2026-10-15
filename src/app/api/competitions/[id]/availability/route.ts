import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { cached } from "@/lib/cache";
import { bus } from "@/lib/realtime";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  bus();
  const rows = await cached(`avail:${id}`, 3000, () => prisma.$queryRaw<{ groupId: string; free: number; freeLeft: number }[]>`
    SELECT s."groupId", COUNT(*)::int AS free, COUNT(*) FILTER (WHERE s."isLeftHand")::int AS "freeLeft" FROM "Slot" s JOIN "Group" g ON g.id = s."groupId"
     WHERE g."competitionId" = ${id} AND g."isFinal" = false
       AND (s.state = 'FREE' OR (s.state IN ('HELD','PENDING') AND s."holdExpiresAt" < now()))
  GROUP BY s."groupId"`);
  // freeLeft lets the board count only the targets that suit the shooter's dominant hand
  return ok({ free: Object.fromEntries(rows.map((r) => [r.groupId, r.free])), freeLeft: Object.fromEntries(rows.map((r) => [r.groupId, r.freeLeft])) });
});
