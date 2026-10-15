/**
 * Set a staff member's sign-in name and password from the command line — used to create the first
 * administrator on a fresh deployment, or to recover access.
 *
 *   npm run staff:login -- <civilId> <email-or-username> <password>
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword, LOGIN_RE, passwordOk, PASSWORD_RULE } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const [civilId, rawLogin, password] = process.argv.slice(2);
  if (!civilId || !rawLogin || !password) throw new Error("Usage: npm run staff:login -- <civilId> <email-or-username> <password>");
  const login = rawLogin.trim().toLowerCase();
  if (!LOGIN_RE.test(login)) throw new Error("Username: 3–64 characters — letters, numbers, dots, dashes, or an email address");
  if (!passwordOk(password)) throw new Error(`Password: ${PASSWORD_RULE.toLowerCase()}`);
  const user = await prisma.user.findUnique({ where: { civilId }, include: { roles: true } });
  if (!user) throw new Error(`No member with civil ID ${civilId}`);
  if (!user.roles.some((r) => r.role !== "SHOOTER")) {
    await prisma.userRole.create({ data: { userId: user.id, role: "ADMIN" } });
    console.log(`Granted ADMIN to ${user.fullName}.`);
  }
  await prisma.user.update({ where: { id: user.id }, data: { username: login, passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
  await prisma.auditLog.create({ data: { action: "staff.credentials", entity: "User", entityId: user.id, reason: "Set from command line" } });
  console.log(`${user.fullName} can now sign in at /staff/login as ${login}.`);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
