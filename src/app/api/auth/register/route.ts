import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { verifyTemp } from "@/lib/session";
import { AppError, dateOnly, isSafeDataUrl } from "@/lib/utils";

const Body = z.object({
  fullName: z.string().min(3),
  tribe: z.string().optional(),
  mobile: z.string().regex(/^(\+?968)?[279]\d{7}$/, "Enter an Omani mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]),
  hand: z.enum(["RIGHT", "LEFT"]),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  governorate: z.string().min(2),
  wilayat: z.string().optional(),
  photo: z.string().max(1_000_000).optional().nullable(),
  idExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  idScanned: z.boolean().optional(),
});

export const POST = handle(async (req: Request) => {
  const c = await cookies();
  const tmp = await verifyTemp<{ civilId: string }>(c.get("reg")?.value);
  if (!tmp) throw new AppError("Verification expired — sign in again", 401);
  const d = Body.parse(await req.json());
  if (d.photo && !isSafeDataUrl(d.photo)) throw new AppError("Photo must be an image");
  if (await prisma.user.findUnique({ where: { civilId: tmp.civilId } })) throw new AppError("This civil ID is already registered — please sign in", 409);
  const user = await prisma.user.create({
    data: {
      civilId: tmp.civilId, fullName: d.fullName, tribe: d.tribe, mobile: d.mobile, email: d.email || null, gender: d.gender,
      hand: d.hand, dob: dateOnly(d.dob), governorate: d.governorate, wilayat: d.wilayat,
      photo: d.photo ?? null, idExpiry: d.idExpiry ? dateOnly(d.idExpiry) : null, idScanned: !!d.idScanned,
      roles: { create: { role: "SHOOTER" } },
    },
  });
  c.delete("reg");
  await startSession(user.id);
  return ok({ ok: true });
});
