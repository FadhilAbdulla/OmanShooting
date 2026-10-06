import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: Prisma.InputJsonValue,
  reason?: string,
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, data, reason } });
}
