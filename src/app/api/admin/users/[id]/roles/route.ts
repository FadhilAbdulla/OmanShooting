import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/utils";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const { role, grant, reason } = z.object({ role: z.enum(["ADMIN", "JUDGE", "RECEPTION", "SHOOTER"]), grant: z.boolean(), reason: z.string().min(3, "A reason is required") }).parse(await req.json());
  if (id === s.uid && role === "ADMIN" && !grant) throw new AppError("You cannot remove your own admin role", 409);
  if (grant) await prisma.userRole.upsert({ where: { userId_role: { userId: id, role } }, create: { userId: id, role, grantedBy: s.uid }, update: {} });
  else await prisma.userRole.deleteMany({ where: { userId: id, role } });
  await audit(s.uid, grant ? "role.grant" : "role.revoke", "User", id, { role }, reason); // RBAC-03
  return ok();
});
