import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { cached } from "@/lib/cache";
import { bus } from "@/lib/realtime";

/** Public view of a group's targets. Expired holds are reported as free (lazy expiry). */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const s = await getSession();
  const now = Date.now();
  bus(); // make sure this instance is listening for invalidations
  const slots = await cached(`group:${id}`, 3000, () => prisma.slot.findMany({ where: { groupId: id }, orderBy: { targetNo: "asc" } }));
  return ok({
    slots: slots.map((x) => {
      const expired = (x.state === "HELD" || x.state === "PENDING") && x.holdExpiresAt && x.holdExpiresAt.getTime() < now;
      const state = expired ? "FREE" : x.state;
      return {
        id: x.id, targetNo: x.targetNo, isLeftHand: x.isLeftHand, state,
        mine: !!s && x.userId === s.uid && state !== "FREE",
        holdExpiresAt: state === "HELD" && x.userId === s?.uid ? x.holdExpiresAt : null,
      };
    }),
  });
});
