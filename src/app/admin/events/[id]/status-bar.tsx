"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, LinkButton } from "@/components/ui";
import { toast } from "@/components/toast";

export function StatusBar({ id, slug, status, checks, ready, testCount }: { id: string; slug: string; status: string; checks: { ok: boolean; label: string }[]; ready: boolean; testCount: number }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, msg: string) => { setBusy(true); try { await fn(); toast(msg); r.refresh(); } catch {} setBusy(false); };
  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      {status === "DRAFT" ? (
        <>
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
            <div className="text-sm font-semibold">Draft · test mode</div>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {checks.map((c) => <li key={c.label} className={c.ok ? "text-oasis-600" : "text-rose-600"}>{c.ok ? "✓" : "✕"} {c.label}</li>)}
            </ul>
          </div>
          <LinkButton href={`/events/${slug}`} variant="secondary" size="sm">Test-book as shooter ↗</LinkButton>
          {testCount > 0 && <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api(`/api/admin/events/${id}/reset-test`, { body: {} }), "Test data cleared")}>Reset {testCount} test booking(s)</Button>}
          <Button variant="success" disabled={busy || !ready} title={ready ? "" : "Complete the checklist"} onClick={() => confirm(`Publish now? ${testCount ? `${testCount} test booking(s) will be removed and all targets reset.` : ""}`) && run(() => api(`/api/admin/events/${id}/status`, { body: { status: "PUBLISHED" } }), "Event published 🎉")}>Publish</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => confirm("Delete this draft event permanently?") && run(async () => { await api(`/api/admin/events/${id}`, { method: "DELETE" }); r.push("/admin/events"); }, "Deleted")}>Delete</Button>
        </>
      ) : (
        <>
          <div className="basis-full text-sm sm:flex-1 sm:basis-0"><b>{status === "PUBLISHED" ? "Live" : "Closed"}</b> — visible to the public. {status === "PUBLISHED" && "Registration opens/closes automatically by the dates in Settings."}</div>
          <LinkButton href={`/events/${slug}`} variant="secondary" size="sm">View public page ↗</LinkButton>
          <LinkButton href={`/tv/${slug}`} variant="secondary" size="sm">TV mode ↗</LinkButton>
          {status === "PUBLISHED" ? (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => confirm("Close registration and archive this event?") && run(() => api(`/api/admin/events/${id}/status`, { body: { status: "CLOSED" } }), "Event closed")}>Close event</Button>
          ) : (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => api(`/api/admin/events/${id}/status`, { body: { status: "PUBLISHED" } }), "Reopened")}>Reopen</Button>
          )}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api(`/api/admin/events/${id}/status`, { body: { status: "DRAFT" } }), "Back to draft")}>Unpublish</Button>
        </>
      )}
    </Card>
  );
}
