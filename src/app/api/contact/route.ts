import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { AppError } from "@/lib/utils";

const Body = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  mobile: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  subject: z.string().trim().min(2, "Please choose a subject").max(120),
  message: z.string().trim().min(10, "Please write a little more (10+ characters)").max(4000),
  website: z.string().optional(), // honeypot: real people leave it empty
});

/** WEB-06: Contact Us form. Messages are stored for staff to read in Admin › Messages. */
export const POST = handle(async (req: Request) => {
  const d = Body.parse(await req.json());
  if (d.website) return ok({ ok: true }); // silently drop bots
  if (!d.mobile && !d.email) throw new AppError("Give us a mobile number or an email so we can reply", 422);
  const since = new Date(Date.now() - 10 * 60_000);
  const recent = await prisma.contactMessage.count({ where: { createdAt: { gt: since }, OR: [{ email: d.email || undefined }, { mobile: d.mobile || undefined }] } });
  if (recent >= 3) throw new AppError("Thanks — we've received your messages. Please wait a few minutes before sending another.", 429);
  await prisma.contactMessage.create({ data: { name: d.name, mobile: d.mobile || null, email: d.email || null, subject: d.subject, message: d.message } });
  return ok({ ok: true });
});
