import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { Badge, Card, Empty } from "@/components/ui";
import { fmtDateTime, omr } from "@/lib/utils";
import { ReviewActions } from "./actions";

export const dynamic = "force-dynamic";

/** PAY-07 payment review dashboard + PAY-06 daily reconciliation */
export default async function Payments({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  await requirePageRole(["ADMIN", "RECEPTION"]);
  const day = (await searchParams).day ?? new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
  const from = new Date(`${day}T00:00:00+04:00`), to = new Date(from.getTime() + 86_400_000);
  // Reconciliation is by payment day; refunds owed are always listed first in the queue
  const [queue, paidToday] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["REFUND_DUE", "PENDING_REVIEW", "PENDING_CASH"] } }, orderBy: [{ status: "desc" }, { createdAt: "asc" }],
      include: { user: true, bookings: { include: { group: true, competition: true } } },
    }),
    prisma.order.groupBy({ by: ["method"], where: { status: "PAID", paidAt: { gte: from, lt: to }, isTest: false }, _sum: { total: true }, _count: true }),
  ]);
  const total = paidToday.reduce((a, r) => a + Number(r._sum.total ?? 0), 0);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <Card className="p-4">
        <form className="mb-3 flex items-center gap-2 text-sm"><b>Daily reconciliation</b><input type="date" name="day" defaultValue={day} className="h-8 rounded border border-sand-300 px-2" /><button className="text-brand-600">Show</button></form>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {paidToday.map((r) => <div key={r.method} className="rounded-lg bg-sand-100 p-3"><div className="text-xs text-stone-500">{r.method.replace("_", " ")} · {r._count} orders</div><div className="font-semibold tabular">{omr(r._sum.total)}</div></div>)}
          <div className="rounded-lg bg-brand-50 p-3"><div className="text-xs text-stone-500">Total collected</div><div className="font-bold tabular">{omr(total)}</div></div>
        </div>
      </Card>
      <div>
        <h2 className="mb-2 font-semibold">Awaiting action ({queue.length})</h2>
        {!queue.length ? <Empty>Nothing to review 🎉</Empty> : (
          <div className="space-y-2">
            {queue.map((o) => (
              <Card key={o.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{o.user.fullName} <span className="text-xs text-stone-500">{o.user.civilId} · {o.user.mobile}</span></div>
                  <div className="text-xs text-stone-600">{o.ref} · {fmtDateTime(o.createdAt)} · {o.bookings.map((b) => `${b.competition.nameEn} ${b.group.label} #${b.targetNo}`).join(", ")}</div>
                  {o.deadlineAt && <div className="text-xs text-amber-700">Auto-cancels {fmtDateTime(o.deadlineAt)}</div>}
                </div>
                <Badge className={o.status === "REFUND_DUE" ? "bg-rose-100 text-rose-800" : o.status === "PENDING_REVIEW" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}>{o.status === "REFUND_DUE" ? "Refund due" : o.status === "PENDING_REVIEW" ? "Transfer receipt" : "Cash on site"}</Badge>
                {o.isTest && <Badge className="bg-stone-200">test</Badge>}
                <div className="font-semibold tabular">{omr(o.total)}</div>
                <ReviewActions id={o.id} receipt={o.receipt} refund={o.status === "REFUND_DUE"} note={o.reviewNote} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
