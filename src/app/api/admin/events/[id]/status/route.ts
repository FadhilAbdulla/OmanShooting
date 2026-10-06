import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { setEventStatus } from "@/lib/admin";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { status } = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]) }).parse(await req.json());
  await setEventStatus((await params).id, status, s.uid);
  return ok();
});
