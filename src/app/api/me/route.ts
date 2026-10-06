import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { AppError, dateOnly, isSafeDataUrl } from "@/lib/utils";

// MEM-10: civil ID is NOT editable here
const Body = z.object({
  fullName: z.string().min(3), tribe: z.string().optional().nullable(), mobile: z.string().min(8), email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]), hand: z.enum(["RIGHT", "LEFT"]), dob: z.string().optional(), governorate: z.string().optional(),
  wilayat: z.string().optional().nullable(), photo: z.string().max(1_000_000).optional().nullable(),
});

export const PATCH = handle(async (req: Request) => {
  const s = await requireApiRole(null);
  const d = Body.parse(await req.json());
  if (d.photo && !isSafeDataUrl(d.photo)) throw new AppError("Photo must be an image");
  const current = await prisma.user.findUniqueOrThrow({ where: { id: s.uid } });
  // Date of birth decides age categories — once recorded it can only be corrected by the Committee
  const dob = current.dob ? undefined : d.dob ? dateOnly(d.dob) : undefined;
  await prisma.user.update({
    where: { id: s.uid },
    data: { ...d, email: d.email || null, dob, photo: d.photo === undefined ? undefined : d.photo },
  });
  return ok();
});
