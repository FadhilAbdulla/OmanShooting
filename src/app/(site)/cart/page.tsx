"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fileToDataUrl } from "@/lib/client";
import { Button, Card, Empty } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { cn, fmtDate, fmtTime } from "@/lib/utils";

type Item = { slotId: string; targetNo: number; isLeftHand: boolean; holdExpiresAt: string; attemptNo: number; price: string; groupLabel: string; startsAt: string; competition: string; event: string; isTest: boolean; allowCash: boolean; allowTransfer: boolean };

export default function CartPage() {
  const r = useRouter();
  const [cart, setCart] = useState<{ items: Item[]; total: string } | null>(null);
  const [method, setMethod] = useState<"THAWANI" | "BANK_TRANSFER" | "CASH">("THAWANI");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<{ items: Item[]; total: string }>("/api/cart", { quiet: true }).then((c) => { setCart(c); r.refresh(); }).catch(() => r.push("/login?next=/cart"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cart) return <p className="text-stone-500">Loading…</p>;
  if (!cart.items.length) return <Empty>Your cart is empty. Pick a target from a championship to start.</Empty>;
  const earliest = cart.items.reduce((a, i) => (i.holdExpiresAt < a ? i.holdExpiresAt : a), cart.items[0].holdExpiresAt);
  const allowCash = cart.items.every((i) => i.allowCash);
  const allowTransfer = cart.items.every((i) => i.allowTransfer);
  const free = Number(cart.total) === 0;

  async function pay() {
    setBusy(true);
    try {
      const res = await api<{ redirect: string }>("/api/checkout", { body: { method, receipt } });
      r.push(res.redirect);
    } catch { setBusy(false); load(); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <div className="text-sm">Held for <Countdown to={earliest} onExpire={load} /></div>
      </div>
      {cart.items.some((i) => i.isTest) && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Test-mode booking (draft event).</div>}
      {/* TOUR-15b: confirm day, date, group and target before paying */}
      <Card className="divide-y divide-sand-100">
        {cart.items.map((i) => (
          <div key={i.slotId} className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white tabular">{i.targetNo}{i.isLeftHand && <sup className="text-[10px]">L</sup>}</div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{i.competition}</div>
              <div className="text-sm text-stone-600">{fmtDate(i.startsAt)} · {i.groupLabel} · {fmtTime(i.startsAt)}</div>
              <div className="text-xs text-stone-500">{i.event}{i.attemptNo > 1 ? ` · attempt #${i.attemptNo}` : ""}</div>
            </div>
            <div className="text-end tabular font-medium">{Number(i.price).toFixed(3)}</div>
            <button className="text-xs text-rose-600 hover:underline" onClick={async () => { await api(`/api/slots/${i.slotId}/hold`, { method: "DELETE" }); load(); }}>Remove</button>
          </div>
        ))}
        <div className="flex justify-between p-4 text-lg font-semibold"><span>Total</span><span className="tabular">{Number(cart.total).toFixed(3)} OMR</span></div>
      </Card>

      {!free && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">Payment method</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {([["THAWANI", "Card · Thawani", "Instant confirmation", true], ["BANK_TRANSFER", "Bank transfer", "Upload receipt for review", allowTransfer], ["CASH", "Cash on site", "Pay at reception", allowCash]] as const).map(([k, l, d, on]) => (
              <button key={k} disabled={!on} onClick={() => setMethod(k)} className={cn("rounded-lg border p-3 text-start disabled:opacity-40", method === k ? "border-brand-500 bg-brand-50" : "border-sand-200")}>
                <div className="font-medium">{l}</div><div className="text-xs text-stone-500">{d}</div>
              </button>
            ))}
          </div>
          {method === "BANK_TRANSFER" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Transfer receipt (image or PDF)</span>
              <input type="file" accept="image/*,application/pdf" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setReceipt(await fileToDataUrl(f)); }} />
            </label>
          )}
          {method === "CASH" && <p className="text-xs text-stone-600">Your targets are reserved until the payment deadline. Unpaid bookings are released automatically.</p>}
        </Card>
      )}
      <Button size="lg" className="w-full" disabled={busy || (method === "BANK_TRANSFER" && !receipt && !free)} onClick={pay}>
        {busy ? "Processing…" : free ? "Confirm booking" : method === "THAWANI" ? `Pay ${Number(cart.total).toFixed(3)} OMR` : "Place booking"}
      </Button>
    </div>
  );
}
