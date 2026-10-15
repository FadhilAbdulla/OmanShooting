"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button } from "@/components/ui";

export function MarkHandled({ id }: { id: string }) {
  const r = useRouter();
  return <Button size="sm" variant="secondary" onClick={async () => { await api(`/api/admin/messages/${id}`, { body: {} }); r.refresh(); }}>Mark handled</Button>;
}
