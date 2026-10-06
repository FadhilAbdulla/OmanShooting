import { sweep } from "./lib/booking";

const g = globalThis as unknown as { __sweeper?: NodeJS.Timeout };
if (!g.__sweeper) {
  // Expired holds are already treated as free by every query; this just tidies rows, expires unpaid orders and pushes board updates.
  g.__sweeper = setInterval(() => sweep().catch((e) => console.error("sweep failed", e)), 15_000);
}
