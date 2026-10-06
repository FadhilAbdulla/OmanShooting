"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function CloneButton({ id }: { id: string }) {
  const r = useRouter();
  return (
    <button className="text-xs text-brand-600 hover:underline" onClick={async () => {
      const d = prompt("Start date for the copy (YYYY-MM-DD). All competitions, sub-competitions and groups are copied and shifted.", new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
      if (!d) return;
      const res = await api<{ id: string }>(`/api/admin/events/${id}/clone`, { body: { startDate: d } });
      r.push(`/admin/events/${res.id}`);
    }}>Clone</button>
  );
}
