import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireApiRole, STAFF } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hashPassword, LOGIN_RE, passwordOk, PASSWORD_RULE } from "@/lib/password";
import { AppError } from "@/lib/utils";

const Body = z.object({
  login: z.string().trim().toLowerCase().optional(),
  password: z.string().max(200).optional(),
  unlock: z.boolean().optional(),
});

/** Administrators set a staff member's sign-in name, reset their password, or lift a lockout. */
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const d = Body.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { id }, include: { roles: { select: { role: true } } } });
  if (!user || !user.roles.some((r) => STAFF.includes(r.role))) throw new AppError("Give this member a staff role first", 404);

  const data: { username?: string; passwordHash?: string; failedLogins?: number; lockedUntil?: null } = {};
  if (d.login !== undefined) {
    if (!LOGIN_RE.test(d.login)) throw new AppError("Username: 3–64 characters — letters, numbers, dots, dashes, or an email address", 422);
    const taken = await prisma.user.findFirst({ where: { username: d.login, id: { not: id } } });
    if (taken) throw new AppError("That username is already in use", 409);
    data.username = d.login;
  }
  if (d.password) {
    if (!passwordOk(d.password)) throw new AppError(`Password: ${PASSWORD_RULE.toLowerCase()}`, 422);
    data.passwordHash = await hashPassword(d.password);
    data.failedLogins = 0; data.lockedUntil = null;
  }
  if (d.unlock) { data.failedLogins = 0; data.lockedUntil = null; }
  if (!Object.keys(data).length) throw new AppError("Nothing to update", 422);
  if (data.passwordHash && !(data.username ?? user.username)) throw new AppError("Set a username before setting a password", 422);

  await prisma.user.update({ where: { id }, data });
  await audit(s.uid, "staff.credentials", "User", id, { username: data.username ?? null, password: !!data.passwordHash, unlock: !!d.unlock });
  return ok({ ok: true });
});
