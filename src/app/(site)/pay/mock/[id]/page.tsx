"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card } from "@/components/ui";

export default function MockGateway({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async (action: "pay" | "cancel") => {
    setBusy(true);
    try { const res = await api<{ redirect: string }>("/api/payments/mock", { body: { orderId: id, action } }); r.push(res.redirect); }
    catch { r.push(`/orders/${id}`); }
  };
  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-4 p-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-stone-500">Sandbox</div>
          <h1 className="text-xl font-bold">Thawani Checkout (mock)</h1>
          <p className="text-sm text-stone-600">Set THAWANI_SECRET_KEY to use the real gateway.</p>
        </div>
        <div className="rounded-lg bg-sand-100 p-3 font-mono text-sm">4242 4242 4242 4242 · 12/30 · 123</div>
        <Button size="lg" className="w-full" disabled={busy} onClick={() => go("pay")}>Pay now</Button>
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => go("cancel")}>Cancel payment</Button>
      </Card>
    </div>
  );
}
