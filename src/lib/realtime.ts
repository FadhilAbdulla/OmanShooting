import { EventEmitter } from "events";
import { Client } from "pg";
import { prisma } from "./db";
import { invalidate, invalidatePrefix } from "./cache";

/**
 * Real-time fan-out (ARCHT-05).
 * Writers call publish() → Postgres NOTIFY. Every app instance holds ONE LISTEN connection and
 * fans messages out to its SSE subscribers through an in-memory EventEmitter. This scales
 * horizontally with no extra infrastructure; swap for Redis pub/sub if NOTIFY volume grows.
 */
const CHANNEL = "rt";
const g = globalThis as unknown as { __rtBus?: EventEmitter; __rtClient?: Client };

function connect(bus: EventEmitter) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  g.__rtClient = client;
  client.on("notification", (m) => {
    if (!m.payload) return;
    try {
      const msg = JSON.parse(m.payload);
      // Drop cached reads first so subscribers that refetch get fresh data
      if (msg.ch.startsWith("group:")) { invalidate(msg.ch); invalidatePrefix("avail:"); }
      if (msg.ch.startsWith("scores:")) invalidatePrefix(`lb:${msg.ch.slice(7)}`);
      bus.emit(msg.ch, msg);
    } catch {}
  });
  let retried = false;
  const retry = (err?: unknown) => {
    if (retried) return;
    retried = true;
    console.error("realtime: LISTEN connection lost, reconnecting", err);
    client.removeAllListeners("notification");
    client.on("error", () => {}); // a dead client may still emit errors — never let them crash the process
    client.end().catch(() => {});
    setTimeout(() => connect(bus), 2000);
  };
  client.on("error", retry);
  client.on("end", retry);
  client.connect().then(() => client.query(`LISTEN ${CHANNEL}`)).catch(retry);
}

export function bus() {
  if (!g.__rtBus) {
    g.__rtBus = new EventEmitter();
    g.__rtBus.setMaxListeners(0);
    connect(g.__rtBus);
  }
  return g.__rtBus;
}

export async function publish(ch: string, data: Record<string, unknown> = {}) {
  await prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify({ ch, ...data, at: Date.now() })})`;
}

export const channels = {
  group: (id: string) => `group:${id}`,
  competition: (id: string) => `comp:${id}`,
  scores: (competitionId: string) => `scores:${competitionId}`,
  admin: "admin",
};
