import { createHash, randomBytes, randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { sendSms } from "@/lib/notify";
import { AppError, isDemo } from "@/lib/utils";

const Body = z.object({ civilId: z.string().regex(/^\d{6,12}$/, "Civil ID must be 6–12 digits") });

export const POST = handle(async (req: Request) => {
  const { civilId } = Body.parse(await req.json());
  // Throttle per civil ID: 3 per minute and 10 per hour (caps brute-force to ~50 guesses/hour)
  const [perMinute, perHour] = await Promise.all([
    prisma.otpCode.count({ where: { civilId, createdAt: { gt: new Date(Date.now() - 60_000) } } }),
    prisma.otpCode.count({ where: { civilId, createdAt: { gt: new Date(Date.now() - 3_600_000) } } }),
  ]);
  if (perMinute >= 3 || perHour >= 10) throw new AppError("Too many requests — please wait before trying again", 429);

  const code = String(randomInt(100000, 999999));
  const salt = randomBytes(16).toString("hex");
  await prisma.otpCode.create({
    data: {
      civilId, salt,
      codeHash: createHash("sha256").update(salt + code).digest("hex"), // MEM-05: only the salted SHA-256 is stored
      expiresAt: new Date(Date.now() + 10 * 60_000), // within the 1-hour ceiling in MEM-05
    },
  });
  const user = await prisma.user.findUnique({ where: { civilId } });
  if (user) await sendSms(user.mobile, `Your verification code is ${code}`);
  else console.log(`[OTP new member ${civilId}] ${code}`);

  // Same response whether or not the civil ID is registered (no account enumeration)
  return ok({ sent: true, devCode: isDemo() ? code : undefined });
});
