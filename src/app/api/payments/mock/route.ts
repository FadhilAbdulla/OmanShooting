import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { confirmOrder, failOrder } from "@/lib/booking";
import { thawaniEnabled } from "@/lib/payments/thawani";
import { AppError, isDemo } from "@/lib/utils";

const Body = z.object({ orderId: z.string(), action: z.enum(["pay", "cancel"]) });

/** Development stand-in for the Thawani hosted page. Disabled when real keys are configured. */
export const POST = handle(async (req: Request) => {
  if (thawaniEnabled() || !isDemo()) throw new AppError("Sandbox payments are disabled", 404);
  const s = await requireApiRole(null);
  const { orderId, action } = Body.parse(await req.json());
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== s.uid) throw new AppError("Order not found", 404);
  if (action === "pay") {
    if (order.deadlineAt && order.deadlineAt < new Date()) {
      await failOrder(orderId, "EXPIRED", null);
      throw new AppError("Payment window expired — targets were released", 409);
    }
    await confirmOrder(orderId, null);
  } else await failOrder(orderId, "CANCELLED", null);
  return ok({ redirect: `/orders/${orderId}` });
});
