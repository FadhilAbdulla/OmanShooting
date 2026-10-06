/**
 * Concurrency proof: N different shooters try to grab THE SAME target at the same instant,
 * then N shooters spread over one group's targets. Expect exactly one winner per target, zero double bookings.
 *
 *   npx tsx scripts/load-test.ts [concurrency=500] [baseUrl=http://localhost:3000]
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const N = Number(process.argv[2] ?? 500);
const BASE = process.argv[3] ?? "http://localhost:3000";
const prisma = new PrismaClient();
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me-please-32chars!!");

async function main() {
  // Create N throwaway eligible shooters (adult men, right-handed)
  const existing = await prisma.user.findMany({ where: { civilId: { startsWith: "9" } }, select: { id: true }, take: N });
  const need = N - existing.length;
  if (need > 0) {
    await prisma.user.createMany({
      data: [...Array(need)].map((_, i) => ({ civilId: `9${String(existing.length + i).padStart(7, "0")}`, fullName: `Load Tester ${existing.length + i}`, mobile: "90000000", gender: "MALE" as const, hand: "RIGHT" as const, dob: new Date("1990-01-01") })),
    });
  }
  const users = await prisma.user.findMany({ where: { civilId: { startsWith: "9" } }, select: { id: true }, take: N });
  const tokens = await Promise.all(users.map((u) => new SignJWT({ uid: u.id, roles: ["SHOOTER"], name: "load", authAt: Date.now() }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30m").sign(secret)));

  // Pick an upcoming group of a published event with free right-hand targets
  const group = await prisma.group.findFirst({
    where: { isFinal: false, startsAt: { gt: new Date() }, competition: { event: { status: "PUBLISHED" }, genderRule: { in: ["ANY", "MALE"] }, minAge: null, maxAge: null }, slots: { some: { state: "FREE", isLeftHand: false } } },
    include: { slots: { where: { state: "FREE", isLeftHand: false }, orderBy: { targetNo: "asc" } }, competition: true },
    orderBy: { startsAt: "desc" },
  });
  if (!group) throw new Error("No suitable group — run `npm run db:seed` first");
  const hold = (slotId: string, token: string) =>
    fetch(`${BASE}/api/slots/${slotId}/hold`, { method: "POST", headers: { cookie: `session=${token}` } }).then((r) => r.status).catch(() => 0);

  // --- Test 1: everybody hits the same target ---
  const target = group.slots[0];
  console.log(`\nTest 1: ${N} shooters → ${group.competition.nameEn} ${group.label} target #${target.targetNo}`);
  let t = Date.now();
  const r1 = await Promise.all(tokens.map((tk) => hold(target.id, tk)));
  const tally = (r: number[]) => r.reduce<Record<number, number>>((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {});
  console.log(`  ${Date.now() - t} ms · status counts:`, tally(r1));
  const holders = await prisma.slot.findUnique({ where: { id: target.id } });
  console.log(`  winners: ${r1.filter((s) => s === 200).length} (expected 1) · slot now HELD by ${holders?.userId?.slice(0, 8)}`);

  // --- Test 2: everybody stampedes the whole group (each shooter picks a random free target) ---
  const free = group.slots.slice(1);
  console.log(`\nTest 2: ${N} shooters → ${free.length} remaining targets in the same group (random picks)`);
  t = Date.now();
  const r2 = await Promise.all(tokens.map((tk) => hold(free[Math.floor(Math.random() * free.length)].id, tk)));
  console.log(`  ${Date.now() - t} ms · status counts:`, tally(r2));
  const after = await prisma.slot.findMany({ where: { groupId: group.id, state: "HELD" } });
  const distinctUsers = new Set(after.map((s) => s.userId)).size;
  console.log(`  held targets: ${after.length}, distinct holders: ${distinctUsers} → ${after.length === distinctUsers ? "✅ no shooter holds two targets" : "❌ DUPLICATE"}`);
  const dupTargets = await prisma.$queryRaw<{ c: number }[]>`SELECT COUNT(*)::int c FROM (SELECT "groupId","targetNo" FROM "Slot" GROUP BY 1,2 HAVING COUNT(*)>1) x`;
  console.log(`  duplicate target rows: ${dupTargets[0].c} → ${dupTargets[0].c === 0 ? "✅ no double booking" : "❌"}`);

  // Clean up the holds so the demo data stays tidy
  await prisma.slot.updateMany({ where: { groupId: group.id, state: "HELD", user: { civilId: { startsWith: "9" } } }, data: { state: "FREE", userId: null, holdExpiresAt: null } });
  console.log("\nCleaned up test holds.");
}

main().finally(() => prisma.$disconnect());
