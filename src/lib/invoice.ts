import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Arbitrary constant: one advisory lock serialises numbering so invoice numbers stay gap-free and in order. */
const INVOICE_LOCK = 7_316_001;

/**
 * Issues the next invoice number for a paid order, inside the caller's transaction. Idempotent: an order keeps
 * the number it already has, and test (draft-event) orders never get one.
 */
export async function issueInvoice(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${INVOICE_LOCK})::text AS locked`;
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { invoiceNo: true, isTest: true, status: true } });
  if (!order || order.invoiceNo != null || order.isTest || order.status !== "PAID") return order?.invoiceNo ?? null;
  const [{ next }] = await tx.$queryRaw<{ next: number }[]>`SELECT (COALESCE(MAX("invoiceNo"), 0) + 1)::int AS next FROM "Order"`;
  await tx.order.update({ where: { id: orderId }, data: { invoiceNo: next, invoicedAt: new Date() } });
  return next;
}

export const invoiceLabel = (n: number) => `INV-${String(n).padStart(6, "0")}`;

export const invoiceUrl = (orderId: string) => `${process.env.APP_URL || "http://localhost:3000"}/invoice/${orderId}`;

/** Seller details printed on every invoice — set them per deployment. */
export function invoiceSeller() {
  return {
    name: process.env.INVOICE_SELLER_NAME || "Oman Committee for Traditional Shooting",
    nameAr: process.env.INVOICE_SELLER_NAME_AR || "اللجنة العُمانية للرماية التقليدية",
    address: process.env.INVOICE_SELLER_ADDRESS || "Muscat, Sultanate of Oman",
    vatin: process.env.INVOICE_SELLER_VATIN || null,
    cr: process.env.INVOICE_SELLER_CR || null,
  };
}

/** VAT rate in percent (Oman standard rate is 5%). 0 = fees are not subject to VAT. Prices are VAT-inclusive. */
export function vatRate() {
  const n = Number(process.env.INVOICE_VAT_RATE ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Splits a VAT-inclusive amount into net + VAT, rounded to baisa (3 decimals). */
export function vatSplit(total: Prisma.Decimal | number | string, rate = vatRate()) {
  const gross = new Prisma.Decimal(total);
  if (!rate) return { net: gross, vat: new Prisma.Decimal(0), gross };
  const net = gross.div(new Prisma.Decimal(1).plus(new Prisma.Decimal(rate).div(100))).toDecimalPlaces(3);
  return { net, vat: gross.minus(net), gross };
}
