-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_DUE';

-- DropIndex
DROP INDEX "Booking_userId_idx";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "selfCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Competition" ALTER COLUMN "firearm" SET DEFAULT 'Traditional rifle (Saktoun)';

-- CreateIndex
CREATE INDEX "Booking_userId_competitionId_idx" ON "Booking"("userId", "competitionId");

-- CreateIndex
CREATE INDEX "Booking_orderId_idx" ON "Booking"("orderId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Slot_userId_state_idx" ON "Slot"("userId", "state");
