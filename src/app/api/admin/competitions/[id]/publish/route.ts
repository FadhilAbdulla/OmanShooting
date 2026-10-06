import { requireApiRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { publishResults } from "@/lib/scoring";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireApiRole(["ADMIN"]);
  const { unlock } = await req.json().catch(() => ({ unlock: false }));
  await publishResults((await params).id, s.uid, !!unlock);
  return ok();
});
