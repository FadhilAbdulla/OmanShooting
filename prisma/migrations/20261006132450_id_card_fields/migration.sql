-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idExpiry" DATE,
ADD COLUMN     "idScanned" BOOLEAN NOT NULL DEFAULT false;
