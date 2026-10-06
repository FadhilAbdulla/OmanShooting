import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { Badge, Card, LinkButton } from "@/components/ui";
import { badgeStyle, eventBadge } from "@/lib/events";
import { fmtDate } from "@/lib/utils";
import { CloneButton } from "./clone";

export const dynamic = "force-dynamic";

export default async function Events() {
  await requirePageRole(["ADMIN"]);
  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { competitions: true } }, competitions: { select: { _count: { select: { bookings: { where: { status: "CONFIRMED", isTest: false } } } } } } },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Events</h1><LinkButton href="/admin/events/new">+ New event</LinkButton></div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand-100/60 text-xs uppercase text-stone-500"><tr><th className="p-3 text-start">Event</th><th className="p-3 text-start">Dates</th><th className="p-3">Status</th><th className="p-3 text-end">Competitions</th><th className="p-3 text-end">Bookings</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y divide-sand-100">
            {events.map((e) => { const b = eventBadge(e); return (
              <tr key={e.id} className="hover:bg-sand-50">
                <td className="p-3"><Link href={`/admin/events/${e.id}`} className="font-medium text-brand-700 hover:underline">{e.nameEn}</Link><div className="text-xs text-stone-500">{e.nameAr} · {e.location}</div></td>
                <td className="p-3 text-stone-600">{fmtDate(e.startDate)} → {fmtDate(e.endDate)}</td>
                <td className="p-3 text-center"><Badge className={badgeStyle[b]}>{b.replace("_", " ")}</Badge></td>
                <td className="p-3 text-end tabular">{e._count.competitions}</td>
                <td className="p-3 text-end tabular">{e.competitions.reduce((a, c) => a + c._count.bookings, 0)}</td>
                <td className="p-3 text-end"><CloneButton id={e.id} /></td>
              </tr>); })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
