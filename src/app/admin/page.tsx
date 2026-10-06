import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Stat, Badge } from "@/components/ui";
import { badgeStyle, eventBadge } from "@/lib/events";
import { fmtTime, muscatDateTime, omr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // "Today" in Muscat time, whatever the server's timezone
  const startOfDay = muscatDateTime(new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10), "00:00");
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const [users, confirmed, revenue, pending, events, todayGroups, present] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count({ where: { status: "CONFIRMED", isTest: false } }),
    prisma.order.aggregate({ where: { status: "PAID", isTest: false }, _sum: { total: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING_CASH", "PENDING_REVIEW"] } } }),
    prisma.event.findMany({ orderBy: { startDate: "asc" }, where: { status: { not: "CLOSED" } }, take: 6 }),
    prisma.group.findMany({
      where: { startsAt: { gte: startOfDay, lt: endOfDay } }, orderBy: { startsAt: "asc" },
      include: { competition: true, _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
    }),
    prisma.booking.count({ where: { attendance: "PRESENT", group: { startsAt: { gte: startOfDay, lt: endOfDay } } } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {/* STAT-01 basic reports */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Registered members" value={users} />
        <Stat label="Confirmed bookings" value={confirmed} />
        <Stat label="Revenue" value={omr(revenue._sum.total)} />
        <Stat label="Payments to review" value={<Link href="/admin/payments" className="text-brand-600">{pending}</Link>} />
        <Stat label="Checked in today" value={present} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Active events</h2><Link href="/admin/events/new" className="text-sm text-brand-600">+ New event</Link></div>
          <div className="divide-y divide-sand-100">
            {events.map((e) => { const b = eventBadge(e); return (
              <Link key={e.id} href={`/admin/events/${e.id}`} className="flex items-center justify-between py-2 hover:bg-sand-50">
                <span className="text-sm font-medium">{e.nameEn}</span><Badge className={badgeStyle[b]}>{b.replace("_", " ")}</Badge>
              </Link>); })}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Today&apos;s groups</h2>
          {!todayGroups.length && <p className="text-sm text-stone-500">No groups today.</p>}
          <div className="divide-y divide-sand-100">
            {todayGroups.map((g) => (
              <Link key={g.id} href={`/admin/checkin?group=${g.id}`} className="flex items-center justify-between py-2 text-sm hover:bg-sand-50">
                <span><b className="tabular">{fmtTime(g.startsAt)}</b> · {g.competition.nameEn} · {g.label}</span>
                <span className="text-stone-500">{g._count.bookings} shooters →</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
