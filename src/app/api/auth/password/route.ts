import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireApiRole, STAFF } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hashPassword, passwordOk, PASSWORD_RULE, verifyPassword } from "@/lib/password";
import { AppError } from "@/lib/utils";

const Body = z.object({ current: z.string().min(1), next: z.string().min(1).max(200) });

/** Staff change their own password. */
export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(STAFF);
  const { current, next } = Body.parse(await req.json());
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.uid } });
  if (!(await verifyPassword(current, user.passwordHash))) throw new AppError("Your current password is incorrect", 401, "BAD_CREDENTIALS");
  if (!passwordOk(next)) throw new AppError(`New password: ${PASSWORD_RULE.toLowerCase()}`, 422);
  if (next === current) throw new AppError("Choose a password different from the current one", 422);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(user.id, "staff.passwordChanged", "User", user.id);
  return ok({ ok: true });
});
