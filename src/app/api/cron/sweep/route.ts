import { ok } from "@/lib/api";
import { sweep } from "@/lib/booking";
import { AppError } from "@/lib/utils";

// For serverless deployments, hit this every minute from a scheduler. Long-running servers also sweep in instrumentation-node.ts.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    const e = new AppError("Not allowed", 401);
    return Response.json({ error: e.message }, { status: e.status });
  }
  return ok(await sweep());
}
