import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, hasRole } from "@/lib/auth";
import { Badge, Card, LinkButton } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { checkoutUrl } from "@/lib/payments/thawani";
import { fmtDateTime, omr } from "@/lib/utils";
import { invoiceLabel } from "@/lib/invoice";

export const dynamic = "force-dynamic";

const statusText: Record<string, [string, string]> = {
  PAID: ["Confirmed", "bg-emerald-100 text-emerald-800"],
  PENDING: ["Awaiting payment", "bg-amber-100 text-amber-800"],
  PENDING_CASH: ["Pay cash at reception", "bg-amber-100 text-amber-800"],
  PENDING_REVIEW: ["Receipt under review", "bg-sky-100 text-sky-800"],
  REJECTED: ["Payment rejected", "bg-rose-100 text-rose-800"],
  EXPIRED: ["Expired — targets released", "bg-rose-100 text-rose-800"],
  CANCELLED: ["Cancelled", "bg-stone-200 text-stone-700"],
  REFUND_DUE: ["Paid late — refund in progress", "bg-rose-100 text-rose-800"],
};

const METHOD_LABEL: Record<string, string> = { THAWANI: "Card (Thawani)", BANK_TRANSFER: "Bank transfer", CASH: "Cash on site", FREE: "Free entry" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const order = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: { bookings: { include: { group: true, competition: { include: { event: true } } }, orderBy: { group: { startsAt: "asc" } } } },
  });
  if (!order || (order.userId !== s.uid && !hasRole(s, ["ADMIN", "RECEPTION"]))) notFound();
  const [label, cls] = statusText[order.status];
  const ev = order.bookings[0]?.competition.event;
  const first = order.bookings[0]?.group.startsAt;
  const canResume = order.status === "PENDING" && order.gatewayRef && (!order.deadlineAt || order.deadlineAt > new Date());

  // What the shooter should do next, in one sentence
  const next = (() => {
    switch (order.status) {
      case "PAID":
        return { tone: "border-emerald-200 bg-emerald-50 text-emerald-900", title: "You're booked!", body: `Arrive at ${ev?.location} at least 30 minutes before your group (${first ? fmtDateTime(first) : ""}) and show your membership QR at the check-in desk.` };
      case "PENDING":
        return { tone: "border-amber-200 bg-amber-50 text-amber-900", title: "Payment not completed", body: "Your targets are held for a few more minutes. Complete the payment to confirm them." };
      case "PENDING_CASH":
        return { tone: "border-amber-200 bg-amber-50 text-amber-900", title: "Pay at reception to confirm", body: `Please pay ${omr(order.total)} in cash at the range reception before ${order.deadlineAt ? fmtDateTime(order.deadlineAt) : "your group starts"}. Unpaid bookings are released automatically.` };
      case "PENDING_REVIEW":
        return { tone: "border-sky-200 bg-sky-50 text-sky-900", title: "We're checking your transfer", body: "The Committee will review your receipt and confirm your booking. You'll get an SMS once it's approved — your targets stay reserved meanwhile." };
      case "REJECTED":
        return { tone: "border-rose-200 bg-rose-50 text-rose-900", title: "Payment was not accepted", body: `${order.reviewNote ? `Reason: ${order.reviewNote}. ` : ""}Your targets were released — you can book again.` };
      case "EXPIRED":
        return { tone: "border-rose-200 bg-rose-50 text-rose-900", title: "The payment deadline passed", body: "Your targets were released. You can book again if places are still available." };
      case "REFUND_DUE":
        return { tone: "border-rose-200 bg-rose-50 text-rose-900", title: "Your payment arrived after the hold expired", body: "The target had already been taken by another shooter. The Committee will refund you." };
      default:
        return { tone: "border-sand-200 bg-sand-50 text-stone-700", title: "Order cancelled", body: "No payment is due for this order." };
    }
  })();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{ev?.nameEn}</p>
          <h1 className="text-2xl font-bold">Order {order.ref}</h1>
        </div>
        <Badge className={cls}>{label}</Badge>
      </div>
      <div className={`rounded-xl border p-4 ${next.tone}`}>
        <div className="font-semibold">{next.title}</div>
        <p className="mt-1 text-sm">{next.body}</p>
        {canResume && (
          <div className="mt-3 flex items-center gap-3">
            <LinkButton href={checkoutUrl(order.gatewayRef!, order.id)} size="sm">Complete payment</LinkButton>
            {order.deadlineAt && <span className="text-sm">Held for <Countdown to={order.deadlineAt} /></span>}
          </div>
        )}
      </div>
      <Card className="divide-y divide-sand-100">
        {order.bookings.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">{b.targetNo}</div>
            <div className="flex-1">
              <div className="font-medium">{b.competition.nameEn}</div>
              <div className="text-sm text-stone-600">{fmtDateTime(b.group.startsAt)} · Group {b.group.label} · Target {b.targetNo}</div>
              {b.attemptNo > 1 && <div className="text-xs text-stone-500">Attempt #{b.attemptNo}</div>}
            </div>
            <div className="text-end">
              <div className="tabular font-medium">{omr(b.price)}</div>
              {b.participantNo && <div className="text-xs text-stone-500">Participant <b className="text-stone-800">#{b.participantNo}</b></div>}
            </div>
          </div>
        ))}
        <div className="flex justify-between p-4 font-semibold"><span>{METHOD_LABEL[order.method]}</span><span className="tabular">{omr(order.total)}</span></div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {order.invoiceNo != null && <LinkButton href={`/invoice/${order.id}`}>Download invoice {invoiceLabel(order.invoiceNo)}</LinkButton>}
        <LinkButton href="/me" variant="secondary">{order.status === "PAID" ? "My bookings & QR card" : "My bookings"}</LinkButton>
        {ev && <LinkButton href={`/events/${ev.slug}`} variant="ghost">{["EXPIRED", "REJECTED", "CANCELLED"].includes(order.status) ? "Book again" : "Back to championship"}</LinkButton>}
      </div>
    </div>
  );
}
