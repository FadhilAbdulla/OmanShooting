import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { RoleToggle } from "./role-toggle";

export const dynamic = "force-dynamic";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePageRole(["ADMIN"]);
  const q = (await searchParams).q?.trim();
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { civilId: { contains: q } }, { mobile: { contains: q } }] } : {},
    include: { roles: true, _count: { select: { bookings: true } } }, orderBy: { createdAt: "desc" }, take: 200,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Members & roles</h1>
      <form><input name="q" defaultValue={q} placeholder="Search name, civil ID or mobile…" className="h-10 w-full max-w-md rounded-lg border border-sand-300 px-3 text-sm" /></form>
      {/* Phones: one card per member */}
      <div className="space-y-2 md:hidden">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">{u.fullName}</a>
                <div className="text-xs text-stone-500">M{u.memberNo} · {u.civilId} · {u.mobile}</div>
                <div className="text-xs text-stone-500">{u.gender === "MALE" ? "Male" : "Female"} · {u.hand === "LEFT" ? "Left" : "Right"}-handed · {u.governorate}</div>
              </div>
              <span className="shrink-0 text-xs text-stone-500">{u._count.bookings} bookings</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">{(["ADMIN", "JUDGE", "RECEPTION"] as const).map((r) => <RoleToggle key={r} userId={u.id} role={r} has={u.roles.some((x) => x.role === r)} />)}</div>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-sand-100/60 text-xs uppercase text-stone-500"><tr><th className="p-2 text-start">Member</th><th className="p-2 text-start">Civil ID</th><th className="p-2">Gender / hand</th><th className="p-2 text-start">Governorate</th><th className="p-2">Bookings</th><th className="p-2 text-start">Roles</th></tr></thead>
          <tbody className="divide-y divide-sand-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-2"><a href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">{u.fullName}</a><div className="text-xs text-stone-500">M{u.memberNo} · {u.mobile}</div></td>
                <td className="p-2 tabular">{u.civilId}</td>
                <td className="p-2 text-center text-xs">{u.gender === "MALE" ? "M" : "F"} · {u.hand === "LEFT" ? "Left" : "Right"}</td>
                <td className="p-2 text-xs">{u.governorate}</td>
                <td className="p-2 text-center tabular">{u._count.bookings}</td>
                <td className="p-2"><div className="flex flex-wrap gap-1">{(["ADMIN", "JUDGE", "RECEPTION"] as const).map((r) => <RoleToggle key={r} userId={u.id} role={r} has={u.roles.some((x) => x.role === r)} />)}{u.roles.some((x) => x.role === "SHOOTER") && <Badge className="bg-sand-100">SHOOTER</Badge>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
