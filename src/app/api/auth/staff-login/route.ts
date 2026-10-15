import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { startSession, STAFF } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { AppError } from "@/lib/utils";

const Body = z.object({ login: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) });

// A real hash to compare against for unknown accounts, so response time does not reveal which usernames exist
const DUMMY = hashPassword("not-a-real-password-1");

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

/** Committee staff sign-in with username/email + password. Shooters use civil ID + OTP instead. */
export const POST = handle(async (req: Request) => {
  const { login, password } = Body.parse(await req.json());
  const name = login.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: name }, { email: { equals: name, mode: "insensitive" }, username: { not: null } }] },
    include: { roles: { select: { role: true } } },
  });
  const generic = new AppError("Incorrect username or password", 401, "BAD_CREDENTIALS");
  if (!user || !user.passwordHash || !user.roles.some((r) => STAFF.includes(r.role))) {
    await verifyPassword(password, await DUMMY);
    throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(`Too many failed attempts — try again in ${mins} minute${mins === 1 ? "" : "s"} or ask an administrator to unlock your account`, 423, "LOCKED");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    const lock = fails >= MAX_FAILS;
    await prisma.user.update({ where: { id: user.id }, data: lock ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: fails } });
    if (lock) await audit(null, "staff.locked", "User", user.id, { attempts: fails });
    throw generic;
  }
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const s = await startSession(user.id);
  await audit(user.id, "staff.login", "User", user.id);
  return ok({ ok: true, roles: s.roles });
});
