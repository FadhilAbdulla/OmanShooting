import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { checkout } from "@/lib/booking";
import { createCheckout, thawaniEnabled } from "@/lib/payments/thawani";
import { AppError, isDemo, isSafeDataUrl } from "@/lib/utils";

const Body = z.object({
  method: z.enum(["THAWANI", "BANK_TRANSFER", "CASH"]),
  receipt: z.string().max(3_000_000).optional().nullable(), // data URL, ~2MB
});

export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(null);
  const { method, receipt } = Body.parse(await req.json());
  if (receipt && !isSafeDataUrl(receipt, true)) throw new AppError("Receipt must be an image or PDF");
  if (method === "THAWANI" && !thawaniEnabled() && !isDemo()) throw new AppError("Card payment is not available yet — choose another method", 409);
  const order = await checkout(s.uid, method, receipt);
  if (order.method === "THAWANI") {
    const session = await createCheckout({ id: order.id, ref: order.ref, total: Number(order.total), customerId: s.uid });
    await prisma.order.update({ where: { id: order.id }, data: { gatewayRef: session.sessionId } });
    return ok({ orderId: order.id, redirect: session.url });
  }
  return ok({ orderId: order.id, redirect: `/orders/${order.id}` });
});
