import { handle, ok } from "@/lib/api";
import { leaderboard } from "@/lib/scoring";
import { getSession, hasRole } from "@/lib/auth";
import { cached } from "@/lib/cache";
import { bus } from "@/lib/realtime";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await getSession();
  const id = (await params).id;
  const staff = hasRole(s, ["ADMIN", "JUDGE"]);
  bus();
  const lb = await cached(`lb:${id}:${staff}`, 5000, () => leaderboard(id, staff));
  return ok({ rows: lb.rows, teams: lb.teams, locked: lb.locked, maxScore: lb.maxScore, format: lb.comp.format, seriesCount: lb.comp.seriesCount });
});
