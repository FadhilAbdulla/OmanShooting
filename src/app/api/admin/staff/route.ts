import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hashPassword, LOGIN_RE, passwordOk, PASSWORD_RULE } from "@/lib/password";
import { AppError } from "@/lib/utils";

const Body = z.object({
  fullName: z.string().trim().min(2).max(120),
  login: z.string().trim().toLowerCase(),
  password: z.string().max(200),
  role: z.enum(["ADMIN", "JUDGE", "RECEPTION"]),
});

/** Create a standalone staff account. Staff accounts are intentionally separate from shooters. */
export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(["ADMIN"]);
  const d = Body.parse(await req.json());
  if (!LOGIN_RE.test(d.login)) throw new AppError("Username: 3–64 characters — letters, numbers, dots, dashes, or an email address", 422);
  if (!passwordOk(d.password)) throw new AppError(`Password: ${PASSWORD_RULE.toLowerCase()}`, 422);
  if (await prisma.user.findUnique({ where: { username: d.login } })) throw new AppError("That username is already in use", 409);

  const user = await prisma.user.create({
    data: {
      civilId: `STAFF-${randomUUID()}`,
      fullName: d.fullName,
      mobile: "",
      email: d.login.includes("@") ? d.login : null,
      gender: "MALE",
      hand: "RIGHT",
      username: d.login,
      passwordHash: await hashPassword(d.password),
      roles: { create: { role: d.role, grantedBy: s.uid } },
    },
  });
  await audit(s.uid, "staff.create", "User", user.id, { username: d.login, role: d.role });
  return ok({ id: user.id });
});
