import { prisma } from "@/lib/db";
import { Badge, Card, Empty } from "@/components/ui";
import { fmtDateTime, omr } from "@/lib/utils";
import { StaffCancel } from "./staff-cancel";

const statusCls: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
};

export async function Bookings({ eventId }: { eventId: string }) {
  const bookings = await prisma.booking.findMany({
    where: { competition: { eventId }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
    include: { user: true, group: true, competition: true, order: true },
    orderBy: [{ group: { startsAt: "asc" } }, { targetNo: "asc" }],
    take: 1000,
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">{bookings.length} active booking(s)</p>
        <a href={`/api/admin/export?type=bookings&eventId=${eventId}`} className="text-sm font-medium text-brand-600 hover:underline">⬇ Export to Excel (CSV)</a>
      </div>
      {!bookings.length ? <Empty>No bookings yet.</Empty> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-100/60 text-xs uppercase text-stone-500">
              <tr><th className="p-2 text-start">When</th><th className="p-2 text-start">Competition</th><th className="p-2">Target</th><th className="p-2 text-start">Shooter</th><th className="p-2">Status</th><th className="p-2 text-start">Payment</th><th className="p-2">Attendance</th><th className="p-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="p-2 whitespace-nowrap tabular">{fmtDateTime(b.group.startsAt)} <span className="text-stone-500">{b.group.label}</span></td>
                  <td className="p-2">{b.competition.nameEn}</td>
                  <td className="p-2 text-center font-semibold tabular">{b.targetNo}</td>
                  <td className="p-2">{b.user.fullName} <span className="text-xs text-stone-500">{b.participantNo ? `#${b.participantNo}` : ""} · {b.user.civilId}</span></td>
                  <td className="p-2 text-center"><Badge className={statusCls[b.status]}>{b.status.replace("_", " ")}</Badge>{b.isTest && <Badge className="ms-1 bg-stone-200">test</Badge>}</td>
                  <td className="p-2 text-xs">{b.order?.method.replace("_", " ")} · {omr(b.price)}</td>
                  <td className="p-2 text-center text-xs">{b.attendance === "PRESENT" ? "✅" : b.attendance === "ABSENT" ? "❌" : "–"}</td>
                  <td className="p-2 text-end"><StaffCancel id={b.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
