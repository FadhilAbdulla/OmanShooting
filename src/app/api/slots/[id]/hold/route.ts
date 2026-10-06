import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { claimSlot, releaseSlot } from "@/lib/booking";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(null);
  const slot = await claimSlot(s.uid, (await params).id);
  return ok({ ok: true, holdExpiresAt: slot.holdExpiresAt, targetNo: slot.targetNo });
});

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(null);
  await releaseSlot(s.uid, (await params).id);
  return ok();
});
