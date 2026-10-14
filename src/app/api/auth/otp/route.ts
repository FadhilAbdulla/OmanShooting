import { createHash, randomBytes, randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { sendSms } from "@/lib/notify";
import { AppError, isDemo } from "@/lib/utils";
import { normaliseMobile } from "@/lib/oman";

const Body = z.object({
  civilId: z.string().regex(/^\d{6,12}$/, "Civil ID must be 6–12 digits"),
  mobile: z.string().min(1, "Enter your mobile number"),
});

export const POST = handle(async (req: Request) => {
  const body = Body.parse(await req.json());
  const { civilId } = body;
  const entered = normaliseMobile(body.mobile);
  if (!entered) throw new AppError("Enter an Omani mobile number (8 digits starting with 7 or 9)", 422);

  // Throttle per civil ID: 3 per minute and 10 per hour (caps brute-force to ~50 guesses/hour)
  const [perMinute, perHour] = await Promise.all([
    prisma.otpCode.count({ where: { civilId, createdAt: { gt: new Date(Date.now() - 60_000) } } }),
    prisma.otpCode.count({ where: { civilId, createdAt: { gt: new Date(Date.now() - 3_600_000) } } }),
  ]);
  if (perMinute >= 3 || perHour >= 10) throw new AppError("Too many requests — please wait before trying again", 429);

  // Members get the code on the mobile we already hold for them; new shooters on the number they entered
  // (which becomes their verified mobile after they confirm the code).
  const user = await prisma.user.findUnique({ where: { civilId } });
  const target = user ? normaliseMobile(user.mobile) ?? user.mobile : entered;

  const code = String(randomInt(100000, 999999));
  const salt = randomBytes(16).toString("hex");
  await prisma.otpCode.create({
    data: {
      civilId, salt, mobile: target,
      codeHash: createHash("sha256").update(salt + code).digest("hex"), // MEM-05: only the salted SHA-256 is stored
      expiresAt: new Date(Date.now() + 10 * 60_000), // within the 1-hour ceiling in MEM-05
    },
  });
  await sendSms(target, `Your Oman Traditional Shooting verification code is ${code}. It expires in 10 minutes.`);

  return ok({ sent: true, sentTo: `••••${target.slice(-4)}`, devCode: isDemo() ? code : undefined });
});
