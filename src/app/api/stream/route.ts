import { bus } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = /^(group|comp|scores):[\w-]+$|^admin$/;

/** Server-Sent Events: /api/stream?ch=group:abc&ch=scores:xyz */
export async function GET(req: Request) {
  const chs = new URL(req.url).searchParams.getAll("ch").filter((c) => ALLOWED.test(c)).slice(0, 20);
  const b = bus();
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (msg: unknown) => {
        try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(msg)}\n\n`)); } catch {}
      };
      const handlers = chs.map((ch) => {
        const h = (m: unknown) => send(m);
        b.on(ch, h);
        return [ch, h] as const;
      });
      const ping = setInterval(() => { try { ctrl.enqueue(enc.encode(`: ping\n\n`)); } catch {} }, 20_000);
      ctrl.enqueue(enc.encode(`retry: 3000\n\n`));
      cleanup = () => {
        clearInterval(ping);
        handlers.forEach(([ch, h]) => b.off(ch, h));
      };
      req.signal.addEventListener("abort", () => { cleanup(); try { ctrl.close(); } catch {} });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
