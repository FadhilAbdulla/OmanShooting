import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { getCart } from "@/lib/booking";

export const GET = handle(async () => {
  const s = await requireApiRole(null);
  const { items, total } = await getCart(s.uid);
  return ok({
    total: total.toString(),
    items: items.map((i) => ({
      slotId: i.slot.id, targetNo: i.slot.targetNo, isLeftHand: i.slot.isLeftHand, holdExpiresAt: i.slot.holdExpiresAt,
      attemptNo: i.attemptNo, price: i.price.toString(), groupId: i.slot.groupId, groupLabel: i.slot.group.label,
      startsAt: i.slot.group.startsAt, competition: i.slot.group.competition.nameEn, competitionAr: i.slot.group.competition.nameAr,
      event: i.slot.group.competition.event.nameEn, isTest: i.slot.group.competition.event.status === "DRAFT",
      allowCash: i.slot.group.competition.event.allowCash, allowTransfer: i.slot.group.competition.event.allowTransfer,
    })),
  });
});
