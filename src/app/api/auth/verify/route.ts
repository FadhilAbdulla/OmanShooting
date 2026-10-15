import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { startSession, STAFF } from "@/lib/auth";
import { signTemp } from "@/lib/session";
import { AppError } from "@/lib/utils";

const Body = z.object({ civilId: z.string(), code: z.string().length(6) });

export const POST = handle(async (req: Request) => {
  const { civilId, code } = Body.parse(await req.json());
  const otp = await prisma.otpCode.findFirst({
    where: { civilId, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new AppError("Code expired — request a new one", 401);
  // Reserve an attempt atomically so parallel guesses can't exceed the limit
  const reserved = await prisma.otpCode.updateMany({ where: { id: otp.id, attempts: { lt: 5 }, consumedAt: null }, data: { attempts: { increment: 1 } } });
  if (!reserved.count) throw new AppError("Too many attempts — request a new code", 401);
  const a = Buffer.from(createHash("sha256").update(otp.salt + code).digest("hex"));
  const b = Buffer.from(otp.codeHash);
  if (!timingSafeEqual(a, b)) throw new AppError("Incorrect code", 401);
  // Single use: only one concurrent correct request can consume it
  const consumed = await prisma.otpCode.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (!consumed.count) throw new AppError("Code already used", 401);

  const user = await prisma.user.findUnique({ where: { civilId }, include: { roles: { select: { role: true } } } });
  // Staff accounts sign in only with username + password
  if (user?.roles.some((r) => STAFF.includes(r.role))) throw new AppError("Committee staff sign in with username and password on the staff portal", 403, "STAFF_ACCOUNT");
  if (user) {
    const s = await startSession(user.id);
    return ok({ ok: true, roles: s.roles });
  }
  // The mobile the code was sent to is now verified — carry it into onboarding
  (await cookies()).set("reg", await signTemp({ civilId, mobile: otp.mobile }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 900 });
  return ok({ register: true });
});
