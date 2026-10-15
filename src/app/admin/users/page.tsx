import { prisma } from "@/lib/db";
import { requirePageRole, STAFF } from "@/lib/auth";
import { Card, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePageRole(["ADMIN"]);
  const q = (await searchParams).q?.trim();
  const shooterOnly = {
    roles: {
      some: { role: "SHOOTER" as const },
      none: { role: { in: STAFF as never[] } },
    },
  };
  const users = await prisma.user.findMany({
    where: q ? { ...shooterOnly, OR: [{ fullName: { contains: q, mode: "insensitive" } }, { civilId: { contains: q } }, { mobile: { contains: q } }] } : shooterOnly,
    include: { _count: { select: { bookings: true } } }, orderBy: { createdAt: "desc" }, take: 200,
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Shooters</h1>
        <p className="mt-1 text-sm text-stone-600">Registered shooting members only. Staff accounts are managed separately under Staff logins.</p>
      </div>
      <form><input name="q" defaultValue={q} placeholder="Search shooter name, civil ID or mobile…" className="h-10 w-full max-w-md rounded-lg border border-sand-300 px-3 text-sm" /></form>
      {!users.length && <Empty>{q ? "No shooters match your search." : "No shooters registered yet."}</Empty>}
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
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-sand-100/60 text-xs uppercase text-stone-500"><tr><th className="p-2 text-start">Shooter</th><th className="p-2 text-start">Civil ID</th><th className="p-2">Gender / hand</th><th className="p-2 text-start">Governorate</th><th className="p-2">Bookings</th></tr></thead>
          <tbody className="divide-y divide-sand-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-2"><a href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">{u.fullName}</a><div className="text-xs text-stone-500">M{u.memberNo} · {u.mobile}</div></td>
                <td className="p-2 tabular">{u.civilId}</td>
                <td className="p-2 text-center text-xs">{u.gender === "MALE" ? "M" : "F"} · {u.hand === "LEFT" ? "Left" : "Right"}</td>
                <td className="p-2 text-xs">{u.governorate}</td>
                <td className="p-2 text-center tabular">{u._count.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
