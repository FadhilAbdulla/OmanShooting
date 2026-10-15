-- Electronic invoices: sequential invoice number per paid order
ALTER TABLE "Order" ADD COLUMN "invoiceNo" INTEGER, ADD COLUMN "invoicedAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "Order_invoiceNo_key" ON "Order"("invoiceNo");

-- Back-fill orders that are already paid, numbered in the order they were paid
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE("paidAt", "createdAt"), "createdAt", id) AS n
    FROM "Order" WHERE status = 'PAID' AND "isTest" = false
)
UPDATE "Order" o SET "invoiceNo" = numbered.n, "invoicedAt" = COALESCE(o."paidAt", o."createdAt")
  FROM numbered WHERE o.id = numbered.id;
