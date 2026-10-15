import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { getSession, hasRole } from "@/lib/auth";
import { invoiceLabel, invoiceSeller, vatRate, vatSplit } from "@/lib/invoice";
import { fmtDate, fmtDateTime, omr } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/app/print/print-button";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = { THAWANI: "Card (Thawani)", BANK_TRANSFER: "Bank transfer", CASH: "Cash", FREE: "Free entry" };

/** Electronic invoice for a paid order — printable on A4 and saved as PDF from the browser. */
export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(`/invoice/${id}`)}`);
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      bookings: { include: { group: true, competition: { include: { event: true } } }, orderBy: { group: { startsAt: "asc" } } },
    },
  });
  if (!order || (order.userId !== s.uid && !hasRole(s, ["ADMIN", "RECEPTION"]))) notFound();

  if (order.invoiceNo == null || !order.invoicedAt) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">No invoice yet</h1>
        <p className="mt-2 text-sm text-stone-600">An invoice is issued automatically once payment for order {order.ref} is confirmed.{order.isTest ? " Test bookings on draft events never receive one." : ""}</p>
        <Link href={`/orders/${order.id}`} className="mt-4 inline-block font-medium text-brand-600 underline">Back to the order</Link>
      </div>
    );
  }

  const seller = invoiceSeller();
  const rate = vatRate();
  const totals = vatSplit(order.total, rate);
  const number = invoiceLabel(order.invoiceNo);
  // Machine-readable summary for scanners and auditors
  const qr = await QRCode.toDataURL(
    [seller.name, seller.vatin ?? "", number, order.invoicedAt.toISOString(), order.total.toFixed(3), totals.vat.toFixed(3), "OMR"].join("|"),
    { margin: 0, width: 220 },
  );
  const event = order.bookings[0]?.competition.event;

  return (
    <div className="min-h-screen bg-stone-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-3 flex max-w-[210mm] items-center justify-between px-4 no-print">
        <Link href={`/orders/${order.id}`} className="text-sm text-stone-600 hover:text-stone-900">← Back to order</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">Use “Save as PDF” in the print dialog to download</span>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-8 text-sm text-stone-800 shadow-sm sm:p-10 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-brand-500 pb-5">
          <div className="flex items-start gap-3">
            <Logo className="h-12 w-12" />
            <div>
              <div className="font-bold text-stone-900">{seller.name}</div>
              <div dir="rtl" className="text-stone-600">{seller.nameAr}</div>
              <div className="mt-1 text-xs text-stone-500">{seller.address}</div>
              {seller.vatin && <div className="text-xs text-stone-500">VATIN: {seller.vatin}</div>}
              {seller.cr && <div className="text-xs text-stone-500">CR: {seller.cr}</div>}
            </div>
          </div>
          <div className="text-end">
            <div className="text-2xl font-bold tracking-tight text-stone-900">{rate ? "Tax Invoice" : "Invoice"}</div>
            <div dir="rtl" className="text-stone-600">{rate ? "فاتورة ضريبية" : "فاتورة"}</div>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-3 text-xs">
              <dt className="text-stone-500">Invoice no.</dt><dd className="font-semibold tabular">{number}</dd>
              <dt className="text-stone-500">Issue date</dt><dd className="tabular">{fmtDateTime(order.invoicedAt)}</dd>
              <dt className="text-stone-500">Order ref.</dt><dd className="tabular">{order.ref}</dd>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 py-5 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Billed to</div>
            <div className="mt-1 font-semibold text-stone-900">{order.user.fullName}</div>
            <div className="text-stone-600">Member no. {order.user.memberNo} · Civil ID {order.user.civilId}</div>
            <div className="text-stone-600">{order.user.mobile}{order.user.email ? ` · ${order.user.email}` : ""}</div>
          </div>
          <div className="sm:text-end">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Payment</div>
            <div className="mt-1 font-semibold text-emerald-700">Paid{order.paidAt ? ` · ${fmtDateTime(order.paidAt)}` : ""}</div>
            <div className="text-stone-600">{METHOD_LABEL[order.method] ?? order.method}{order.gatewayRef ? ` · ref ${order.gatewayRef}` : ""}</div>
            {event && <div className="text-stone-600">{event.nameEn}</div>}
          </div>
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-stone-300 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <th className="p-2 text-start">#</th>
              <th className="p-2 text-start">Description</th>
              <th className="p-2 text-end">Qty</th>
              <th className="p-2 text-end">Unit price</th>
              <th className="p-2 text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.bookings.map((b, i) => (
              <tr key={b.id} className="border-b border-stone-200 align-top">
                <td className="p-2 tabular">{i + 1}</td>
                <td className="p-2">
                  <div className="font-medium text-stone-900">Championship entry — {b.competition.nameEn}{b.attemptNo > 1 ? ` (attempt ${b.attemptNo})` : ""}</div>
                  <div className="text-xs text-stone-500">{b.competition.event.nameEn} · {fmtDate(b.group.startsAt)} · Group {b.group.label} · Target {b.targetNo}{b.status === "CANCELLED" ? " · cancelled" : ""}</div>
                </td>
                <td className="p-2 text-end tabular">1</td>
                <td className="p-2 text-end tabular">{omr(b.price)}</td>
                <td className="p-2 text-end tabular">{omr(b.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={qr} alt={`QR code for invoice ${number}`} className="h-24 w-24" />
            <p className="max-w-[16rem] text-xs text-stone-500">Electronically issued invoice — valid without signature or stamp. Scan to read the invoice details.</p>
          </div>
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-stone-600">{rate ? "Subtotal (excl. VAT)" : "Subtotal"}</dt><dd className="tabular">{omr(totals.net)}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-600">{rate ? `VAT ${rate}%` : "VAT"}</dt><dd className="tabular">{rate ? omr(totals.vat) : "Not applicable"}</dd></div>
            <div className="flex justify-between border-t border-stone-300 pt-2 text-base font-bold text-stone-900"><dt>Total</dt><dd className="tabular">{omr(totals.gross)}</dd></div>
          </dl>
        </section>

        {["REFUND_DUE", "CANCELLED"].includes(order.status) && (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">This order was later {order.status === "REFUND_DUE" ? "marked for refund" : "cancelled"}. A credit note will be issued for any refunded amount.</p>
        )}
        <footer className="mt-8 border-t border-stone-200 pt-3 text-center text-[11px] text-stone-400">
          {seller.name} · {number} · Generated {fmtDateTime(new Date())}
        </footer>
      </article>
    </div>
  );
}
