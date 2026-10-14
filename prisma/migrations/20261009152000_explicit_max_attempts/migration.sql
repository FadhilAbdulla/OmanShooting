-- TOUR-01/03: attempt eligibility is configured separately from tiered pricing.
-- Existing competitions remain unlimited; the last price tier applies to later attempts.
ALTER TABLE "Competition" ADD COLUMN "maxAttempts" INTEGER;

ALTER TABLE "Competition"
ADD CONSTRAINT "Competition_maxAttempts_check"
CHECK ("maxAttempts" IS NULL OR "maxAttempts" > 0);
