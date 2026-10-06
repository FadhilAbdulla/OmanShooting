import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { EventBody, eventData } from "@/lib/schemas";

export const POST = handle(async (req: Request) => {
  const s = await requireApiRole(["ADMIN"]);
  const d = EventBody.parse(await req.json());
  let slug = slugify(d.nameEn);
  for (let i = 2; await prisma.event.findUnique({ where: { slug } }); i++) slug = `${slugify(d.nameEn)}-${i}`;
  const ev = await prisma.event.create({ data: { ...eventData(d), slug, status: "DRAFT" } });
  await audit(s.uid, "event.create", "Event", ev.id);
  return ok({ id: ev.id });
});
