import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { confirmOrder, failOrder } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/utils";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN", "RECEPTION"]);
  const { action, note } = z.object({ action: z.enum(["approve", "reject", "refunded"]), note: z.string().optional() }).parse(await req.json());
  const id = (await params).id;
  if (action === "refunded") {
    const r = await prisma.order.updateMany({ where: { id, status: "REFUND_DUE" }, data: { status: "CANCELLED", reviewedById: s.uid, reviewNote: note ?? "Refunded" } });
    if (!r.count) throw new AppError("Order is not awaiting a refund", 409);
    await audit(s.uid, "payment.refunded", "Order", id, {}, note);
  } else if (action === "approve") await confirmOrder(id, s.uid, note);
  else await failOrder(id, "REJECTED", s.uid, note);
  return ok();
});
