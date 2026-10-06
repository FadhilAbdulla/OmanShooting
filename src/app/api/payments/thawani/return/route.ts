import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { confirmOrder, failOrder } from "@/lib/booking";
import { isPaid } from "@/lib/payments/thawani";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("order")!;
  const order = await prisma.order.findUnique({ where: { id } });
  if (order?.gatewayRef) {
    if (url.searchParams.get("cancel")) await failOrder(id, "CANCELLED", null);
    else if (await isPaid(order.gatewayRef)) await confirmOrder(id, null, undefined, { gatewayPaid: true });
  }
  return NextResponse.redirect(new URL(`/orders/${id}`, url));
}
