-- Username + password sign-in for committee staff
ALTER TABLE "User" ADD COLUMN "username" TEXT, ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "lockedUntil" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
