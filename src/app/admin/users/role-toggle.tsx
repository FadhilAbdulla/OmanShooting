"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export function RoleToggle({ userId, role, has }: { userId: string; role: string; has: boolean }) {
  const r = useRouter();
  return (
    <button className={cn("rounded-full border px-2 py-0.5 text-xs", has ? "border-brand-500 bg-brand-500 text-white" : "border-sand-300 text-stone-500 hover:bg-sand-100")}
      onClick={async () => {
        const reason = prompt(`${has ? "Remove" : "Grant"} ${role}. Reason (recorded in the audit log):`);
        if (!reason) return;
        await api(`/api/admin/users/${userId}/roles`, { body: { role, grant: !has, reason } });
        r.refresh();
      }}>{role}</button>
  );
}
