-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SHOOTER', 'ADMIN', 'JUDGE', 'RECEPTION');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "GenderRule" AS ENUM ('MALE', 'FEMALE', 'ANY');

-- CreateEnum
CREATE TYPE "Hand" AS ENUM ('RIGHT', 'LEFT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CompFormat" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('INDOOR_AC', 'INDOOR', 'OUTDOOR');

-- CreateEnum
CREATE TYPE "SlotState" AS ENUM ('FREE', 'HELD', 'PENDING', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('THAWANI', 'BANK_TRANSFER', 'CASH', 'FREE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PENDING_CASH', 'PENDING_REVIEW', 'PAID', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('UNKNOWN', 'PRESENT', 'ABSENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "civilId" TEXT NOT NULL,
    "memberNo" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "tribe" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "gender" "Gender" NOT NULL,
    "hand" "Hand" NOT NULL DEFAULT 'RIGHT',
    "dob" DATE,
    "wilayat" TEXT,
    "governorate" TEXT,
    "photo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "civilId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "location" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "regOpensAt" TIMESTAMP(3) NOT NULL,
    "regClosesAt" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "holdMinutes" INTEGER NOT NULL DEFAULT 10,
    "cancelHours" INTEGER NOT NULL DEFAULT 48,
    "maxCancellations" INTEGER NOT NULL DEFAULT 2,
    "paymentDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "allowCash" BOOLEAN NOT NULL DEFAULT true,
    "allowTransfer" BOOLEAN NOT NULL DEFAULT true,
    "participantSeq" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "parentId" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "firearm" TEXT NOT NULL DEFAULT 'Traditional rifle (Saktool)',
    "genderRule" "GenderRule" NOT NULL DEFAULT 'ANY',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "format" "CompFormat" NOT NULL DEFAULT 'INDIVIDUAL',
    "teamSize" INTEGER,
    "shotsPerSeries" INTEGER NOT NULL DEFAULT 10,
    "seriesCount" INTEGER NOT NULL DEFAULT 1,
    "maxScorePerShot" INTEGER NOT NULL DEFAULT 10,
    "venueType" "VenueType" NOT NULL DEFAULT 'OUTDOOR',
    "targetsPerGroup" INTEGER NOT NULL DEFAULT 10,
    "leftHandTargets" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "enforceHand" BOOLEAN NOT NULL DEFAULT true,
    "prices" DECIMAL(10,3)[] DEFAULT ARRAY[]::DECIMAL(10,3)[],
    "maxParticipants" INTEGER,
    "finalistsCount" INTEGER NOT NULL DEFAULT 8,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "resultsLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "targetNo" INTEGER NOT NULL,
    "isLeftHand" BOOLEAN NOT NULL DEFAULT false,
    "state" "SlotState" NOT NULL DEFAULT 'FREE',
    "userId" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" DECIMAL(10,3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "receipt" TEXT,
    "gatewayRef" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT,
    "groupId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "orderId" TEXT,
    "targetNo" INTEGER NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "participantNo" INTEGER,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "attendance" "Attendance" NOT NULL DEFAULT 'UNKNOWN',
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "series" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "total" INTEGER,
    "xCount" INTEGER,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_civilId_key" ON "User"("civilId");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberNo_key" ON "User"("memberNo");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE INDEX "OtpCode_civilId_createdAt_idx" ON "OtpCode"("civilId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Competition_eventId_idx" ON "Competition"("eventId");

-- CreateIndex
CREATE INDEX "Group_competitionId_date_idx" ON "Group"("competitionId", "date");

-- CreateIndex
CREATE INDEX "Slot_state_holdExpiresAt_idx" ON "Slot"("state", "holdExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_groupId_targetNo_key" ON "Slot"("groupId", "targetNo");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_groupId_userId_key" ON "Slot"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_ref_key" ON "Order"("ref");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Booking_groupId_idx" ON "Booking"("groupId");

-- CreateIndex
CREATE INDEX "Booking_competitionId_status_idx" ON "Booking"("competitionId", "status");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
