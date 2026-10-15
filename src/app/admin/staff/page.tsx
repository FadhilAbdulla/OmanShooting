import { prisma } from "@/lib/db";
import { requirePageRole, STAFF } from "@/lib/auth";
import { Badge, Card, Empty } from "@/components/ui";
import { StaffCredentials } from "./credentials";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrator", JUDGE: "Judge", RECEPTION: "Reception" };

/** Sign-in names and passwords for committee staff. Roles themselves are granted under Members & roles. */
export default async function StaffLogins() {
  await requirePageRole(["ADMIN"]);
  const staff = await prisma.user.findMany({
    where: { roles: { some: { role: { in: STAFF as never[] } } } },
    include: { roles: { select: { role: true } } },
    orderBy: { fullName: "asc" },
  });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Staff logins</h1>
        <p className="mt-1 text-sm text-stone-600">Staff sign in at <span className="font-mono">/staff/login</span> with these details. To add someone, give them a role under Members &amp; roles first.</p>
      </div>
      {!staff.length ? <Empty>No staff yet.</Empty> : (
        <div className="space-y-3">
          {staff.map((u) => {
            const locked = !!u.lockedUntil && u.lockedUntil > new Date();
            return (
              <Card key={u.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-stone-900">{u.fullName}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {u.roles.filter((r) => r.role !== "SHOOTER").map((r) => <Badge key={r.role} className="bg-brand-50 text-brand-700">{ROLE_LABEL[r.role] ?? r.role}</Badge>)}
                      {!u.passwordHash ? <Badge className="bg-amber-100 text-amber-800">No password — cannot sign in</Badge>
                        : locked ? <Badge className="bg-rose-100 text-rose-800">Locked</Badge>
                        : <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>}
                    </div>
                  </div>
                  <div className="text-end text-xs text-stone-500">Civil ID {u.civilId}</div>
                </div>
                <StaffCredentials id={u.id} username={u.username} hasPassword={!!u.passwordHash} locked={locked} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
