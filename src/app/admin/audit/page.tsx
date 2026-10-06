import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Audit() {
  await requirePageRole(["ADMIN"]);
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const actors = await prisma.user.findMany({ where: { id: { in: logs.map((l) => l.actorId!).filter(Boolean) } }, select: { id: true, fullName: true } });
  const name = new Map(actors.map((a) => [a.id, a.fullName]));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand-100/60 text-xs uppercase text-stone-500"><tr><th className="p-2 text-start">When</th><th className="p-2 text-start">Who</th><th className="p-2 text-start">Action</th><th className="p-2 text-start">Entity</th><th className="p-2 text-start">Reason / data</th></tr></thead>
          <tbody className="divide-y divide-sand-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="p-2 whitespace-nowrap text-xs tabular">{fmtDateTime(l.createdAt)}</td>
                <td className="p-2">{l.actorId ? name.get(l.actorId) ?? l.actorId : "system"}</td>
                <td className="p-2 font-mono text-xs">{l.action}</td>
                <td className="p-2 text-xs">{l.entity} <span className="text-stone-400">{l.entityId?.slice(0, 10)}</span></td>
                <td className="p-2 text-xs text-stone-600">{l.reason} {l.data ? <code className="text-stone-400">{JSON.stringify(l.data)}</code> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
