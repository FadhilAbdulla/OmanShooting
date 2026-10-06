"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui";
import { toast } from "@/components/toast";

export function ReviewActions({ id, receipt, refund, note }: { id: string; receipt: string | null; refund?: boolean; note?: string | null }) {
  const r = useRouter();
  const [show, setShow] = useState(false);
  const act = async (action: "approve" | "reject") => {
    const note = action === "reject" ? prompt("Reason for rejection (sent to shooter)") : undefined;
    if (action === "reject" && !note) return;
    await api(`/api/admin/orders/${id}`, { body: { action, note } });
    toast(action === "approve" ? "Approved — booking confirmed" : "Rejected — targets released");
    r.refresh();
  };
  if (refund) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-56 text-xs text-rose-700">{note}</span>
        <Button size="sm" variant="secondary" onClick={async () => {
          const ref = prompt("Refund reference (bank / Thawani)");
          if (!ref) return;
          await api(`/api/admin/orders/${id}`, { body: { action: "refunded", note: `Refunded: ${ref}` } });
          toast("Marked as refunded"); r.refresh();
        }}>Mark refunded</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {receipt && <Button size="sm" variant="ghost" onClick={() => setShow(true)}>View receipt</Button>}
      <Button size="sm" variant="success" onClick={() => act("approve")}>Approve</Button>
      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => act("reject")}>Reject</Button>
      {show && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShow(false)}>
          {receipt.startsWith("data:application/pdf") ? <iframe src={receipt} className="h-[80vh] w-full max-w-3xl bg-white" /> : <img src={receipt} alt="Receipt" className="max-h-[85vh] rounded-lg" />}
        </div>
      )}
    </div>
  );
}
