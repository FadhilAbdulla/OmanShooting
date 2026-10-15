import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { Badge, Card, Empty } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { MarkHandled } from "./mark-handled";

export const dynamic = "force-dynamic";

/** Messages sent from the public Contact Us page (WEB-06). */
export default async function Messages() {
  await requirePageRole(["ADMIN", "RECEPTION"]);
  const messages = await prisma.contactMessage.findMany({ orderBy: [{ handledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }], take: 200 });
  const open = messages.filter((m) => !m.handledAt).length;
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Contact messages</h1><p className="text-sm text-stone-600">{open} awaiting a reply · sent from the public Contact Us page</p></div>
      {!messages.length ? <Empty>No messages yet.</Empty> : (
        <div className="space-y-2">
          {messages.map((m) => (
            <Card key={m.id} className={`p-4 ${m.handledAt ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{m.name} <Badge className="ms-1 bg-sand-100 text-sand-700">{m.subject}</Badge></div>
                  <div className="text-xs text-stone-500">
                    {fmtDateTime(m.createdAt)}
                    {m.mobile && <> · <a href={`tel:${m.mobile}`} className="hover:underline" dir="ltr">{m.mobile}</a></>}
                    {m.email && <> · <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`} className="hover:underline">{m.email}</a></>}
                  </div>
                </div>
                {m.handledAt ? <Badge className="bg-emerald-100 text-emerald-800">Handled</Badge> : <MarkHandled id={m.id} />}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{m.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
