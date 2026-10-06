"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function StaffCancel({ id }: { id: string }) {
  const r = useRouter();
  return (
    <button className="text-xs text-rose-600 hover:underline" onClick={async () => {
      const reason = prompt("Reason for cancelling this booking?");
      if (!reason) return;
      await api(`/api/bookings/${id}/cancel`, { body: { asStaff: true, reason } });
      r.refresh();
    }}>Cancel</button>
  );
}
