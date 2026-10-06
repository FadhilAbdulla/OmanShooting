import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const D = 86_400_000;
const muscat = (date: Date, h: number, m = 0) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h - 4, m));
const day = (offset: number) => { const d = new Date(Date.now() + offset * D); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };

const NAMES = ["Salim Al-Harthy", "Hamad Al-Balushi", "Khalid Al-Rawahi", "Said Al-Busaidi", "Ahmed Al-Hinai", "Nasser Al-Maskari", "Sultan Al-Kindi", "Majid Al-Saadi",
  "Talal Al-Abri", "Yousuf Al-Riyami", "Hilal Al-Hashmi", "Badr Al-Shukaili", "Mohammed Al-Farsi", "Ali Al-Lawati", "Saif Al-Mamari", "Rashid Al-Jabri",
  "Faisal Al-Zadjali", "Hamood Al-Wahaibi", "Zahir Al-Amri", "Issa Al-Mahrouqi", "Abdullah Al-Khusaibi", "Saud Al-Ghafri", "Omar Al-Naabi", "Hilal Al-Siyabi",
  "Fatma Al-Harthy", "Maryam Al-Balushi", "Aisha Al-Rawahi", "Zainab Al-Hinai", "Shaima Al-Kindi", "Huda Al-Saadi", "Muna Al-Abri", "Noor Al-Riyami",
  "Yaqoob Al-Busaidi", "Juma Al-Farsi", "Sami Al-Shidi", "Waleed Al-Mukhaini", "Ibrahim Al-Kalbani", "Tariq Al-Hosni", "Marwan Al-Habsi", "Qais Al-Ismaili"];
const GOVS = ["Muscat", "Ad Dakhiliyah", "North Al Batinah", "South Al Batinah", "Ash Sharqiyah", "Dhofar", "Ad Dhahirah", "Al Buraimi"];

const SEED_CIVIL_IDS = [...Array(3)].map((_, i) => String(10000001 + i)).concat([...Array(40)].map((_, i) => String(20000001 + i)));

/**
 * In DEMO_MODE, refresh the demo when every championship has ended AND the database holds nothing but
 * seed data (no other members, no orders except the seeded ones). Anything created by real people
 * blocks the refresh.
 */
async function demoIsStale() {
  if (process.env.DEMO_MODE !== "1") return false;
  const [otherUsers, otherOrders, live] = await Promise.all([
    prisma.user.count({ where: { civilId: { notIn: SEED_CIVIL_IDS } } }),
    prisma.order.count({ where: { NOT: [{ ref: { startsWith: "ORD-SEED" } }, { ref: "ORD-CASHDEMO" }] } }),
    prisma.event.count({ where: { status: "PUBLISHED", endDate: { gte: day(1) } } }),
  ]);
  if (otherUsers || otherOrders) {
    console.log(`Demo refresh skipped: ${otherUsers} non-seed member(s) and ${otherOrders} non-seed order(s) exist.`);
    return false;
  }
  return live === 0;
}

async function main() {
  // One-time forced reseed of a demo (explicitly requested by the owner): FORCE_DEMO_RESEED=<token>.
  // The token is recorded after reseeding, so restarts with the variable still set never wipe again.
  const force = process.env.FORCE_DEMO_RESEED;
  let forced = false;
  if (force && process.env.DEMO_MODE === "1" && process.argv.includes("--if-empty")) {
    const done = await prisma.auditLog.findFirst({ where: { action: "demo.reseed", entityId: force } });
    if (done) console.log(`Forced demo reseed "${force}" already applied — ignoring.`);
    else { console.log(`Forced demo reseed "${force}" requested — wiping and reseeding demo data.`); forced = true; }
  }

  // Deploy-time guards: never wipe data that people created.
  if (!forced && process.argv.includes("--if-empty") && (await prisma.user.count()) > 0) {
    if (!process.argv.includes("--refresh-demo") || !(await demoIsStale())) {
      console.log("Database already has data — skipping seed.");
      return;
    }
    console.log("Demo data has expired and contains only seed records — refreshing demo dates.");
  }
  await prisma.$transaction([
    prisma.booking.deleteMany(), prisma.order.deleteMany(), prisma.slot.deleteMany(), prisma.group.deleteMany(),
    prisma.competition.deleteMany(), prisma.event.deleteMany(), prisma.userRole.deleteMany(), prisma.otpCode.deleteMany(),
    prisma.auditLog.deleteMany(), prisma.user.deleteMany(),
  ]);

  const staff = [
    { civilId: "10000001", fullName: "Committee Administrator", role: "ADMIN" },
    { civilId: "10000002", fullName: "Chief Judge Hamdan", role: "JUDGE" },
    { civilId: "10000003", fullName: "Reception Desk", role: "RECEPTION" },
  ] as const;
  for (const s of staff) {
    await prisma.user.create({ data: { civilId: s.civilId, fullName: s.fullName, mobile: "99444419", gender: "MALE", hand: "RIGHT", dob: new Date("1985-01-01"), governorate: "Muscat", roles: { create: [{ role: s.role }, { role: "SHOOTER" }] } } });
  }
  const shooters: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  for (let i = 0; i < NAMES.length; i++) {
    const female = i >= 24 && i < 32;
    shooters.push(await prisma.user.create({
      data: {
        civilId: String(20000001 + i), fullName: NAMES[i], mobile: `9${String(1000000 + i * 7919).slice(0, 7)}`, gender: female ? "FEMALE" : "MALE",
        hand: i % 7 === 3 ? "LEFT" : "RIGHT", dob: new Date(Date.UTC(1965 + ((i * 7) % 45), i % 12, 1 + (i % 27))), governorate: GOVS[i % GOVS.length],
        roles: { create: { role: "SHOOTER" } },
      },
    }));
  }

  // ---------- Live, published event: started yesterday, runs 4 days ----------
  const s0 = day(-1);
  const ministry = await prisma.event.create({
    data: {
      slug: "ministry-championship-2026", nameEn: "Ministry Championship 2026", nameAr: "بطولة الوزارة للرماية التقليدية ٢٠٢٦",
      descriptionEn: "The flagship national championship for traditional shooting with traditional weapons.", descriptionAr: "البطولة الوطنية الرئيسية للرماية بالأسلحة التقليدية.",
      location: "Muscat — Al Amerat Shooting Range", season: 2026, startDate: s0, endDate: day(6),
      regOpensAt: new Date(Date.now() - 10 * D), regClosesAt: muscat(day(6), 12), status: "PUBLISHED", publishedAt: new Date(),
    },
  });
  const men = await prisma.competition.create({ data: { eventId: ministry.id, nameEn: "Saktoun 10 Shots", nameAr: "الصكتون ١٠ طلقات", genderRule: "ANY", shotsPerSeries: 10, seriesCount: 1, targetsPerGroup: 10, leftHandTargets: [1, 10], prices: [5, 3], venueType: "OUTDOOR", sortOrder: 0 } });
  const subs = [
    await prisma.competition.create({ data: { eventId: ministry.id, parentId: men.id, nameEn: "Saktoun 10 Shots — Men Open", nameAr: "الصكتون ١٠ طلقات — رجال", genderRule: "MALE", minAge: 18, shotsPerSeries: 10, targetsPerGroup: 10, leftHandTargets: [1, 10], prices: [5, 3], sortOrder: 0 } }),
    await prisma.competition.create({ data: { eventId: ministry.id, parentId: men.id, nameEn: "Saktoun 10 Shots — Women", nameAr: "الصكتون ١٠ طلقات — سيدات", genderRule: "FEMALE", shotsPerSeries: 10, targetsPerGroup: 8, leftHandTargets: [1], prices: [3], venueType: "INDOOR_AC", sortOrder: 1 } }),
    await prisma.competition.create({ data: { eventId: ministry.id, parentId: men.id, nameEn: "Saktoun 10 Shots — Youth U18", nameAr: "الصكتون ١٠ طلقات — ناشئين", genderRule: "ANY", maxAge: 17, shotsPerSeries: 10, targetsPerGroup: 8, leftHandTargets: [1], prices: [2], sortOrder: 2 } }),
  ];
  const seven = await prisma.competition.create({ data: { eventId: ministry.id, nameEn: "Abu Fatila 7 Shots", nameAr: "أبو فتيلة ٧ طلقات", genderRule: "MALE", shotsPerSeries: 7, seriesCount: 1, targetsPerGroup: 12, leftHandTargets: [1, 12], prices: [4, 2, 2], venueType: "INDOOR", sortOrder: 1 } });
  const team = await prisma.competition.create({ data: { eventId: ministry.id, nameEn: "Governorates Team Cup", nameAr: "كأس فرق المحافظات", genderRule: "MALE", format: "TEAM", teamSize: 3, shotsPerSeries: 10, seriesCount: 2, targetsPerGroup: 12, leftHandTargets: [1], prices: [6], sortOrder: 2 } });

  const leaves = [...subs, seven, team];
  const groupsByComp = new Map<string, { id: string; startsAt: Date }[]>();
  for (const c of leaves) {
    const arr: { id: string; startsAt: Date }[] = [];
    for (let d = -1; d <= 6; d++) {
      for (let k = 0; k < 4; k++) {
        const startsAt = muscat(day(d), 8 + k);
        const g = await prisma.group.create({
          data: {
            competitionId: c.id, label: `G${k + 1}`, date: day(d), startsAt, endsAt: new Date(startsAt.getTime() + 45 * 60_000),
            slots: { create: [...Array(c.targetsPerGroup)].map((_, i) => ({ targetNo: i + 1, isLeftHand: c.leftHandTargets.includes(i + 1) })) },
          },
        });
        arr.push({ id: g.id, startsAt });
      }
    }
    groupsByComp.set(c.id, arr);
  }

  // Bookings: yesterday's groups for the Men Open with scores, today's/tomorrow's partially booked
  let seq = 0;
  const pnum = new Map<string, number>();
  const menShooters = shooters.filter((u) => u.gender === "MALE" && (u.dob!.getUTCFullYear() < 2008));
  async function book(compId: string, groupId: string, user: (typeof shooters)[number], score?: number) {
    const slots = await prisma.slot.findMany({ where: { groupId, state: "FREE" }, orderBy: { targetNo: "asc" } });
    const slot = slots.find((s) => s.isLeftHand === (user.hand === "LEFT")) ?? null;
    if (!slot) return;
    if (!pnum.has(user.id)) pnum.set(user.id, ++seq);
    const comp = leaves.find((c) => c.id === compId)!;
    const order = await prisma.order.create({ data: { ref: `ORD-SEED${seq}${slot.targetNo}${Math.random().toString(36).slice(2, 6)}`, userId: user.id, total: comp.prices[0], method: "THAWANI", status: "PAID", paidAt: new Date() } });
    await prisma.slot.update({ where: { id: slot.id }, data: { state: "BOOKED", userId: user.id } });
    const series = score != null ? (comp.seriesCount === 2 ? [Math.round(score / 2), score - Math.round(score / 2)] : [score]) : [];
    await prisma.booking.create({
      data: {
        userId: user.id, slotId: slot.id, groupId, competitionId: compId, orderId: order.id, targetNo: slot.targetNo, price: comp.prices[0], status: "CONFIRMED",
        participantNo: pnum.get(user.id), series, total: score ?? null, xCount: score != null ? Math.floor(score / 12) : null, attendance: score != null ? "PRESENT" : "UNKNOWN",
      },
    });
  }
  const menOpenGroups = groupsByComp.get(subs[0].id)!;
  for (let i = 0; i < menShooters.length; i++) {
    await book(subs[0].id, menOpenGroups[i % 4].id, menShooters[i], 70 + ((i * 37) % 29));
  }
  // Today's first two groups: some confirmed bookings waiting for check-in
  for (let i = 0; i < 12; i++) await book(subs[0].id, menOpenGroups[4 + (i % 2)].id, menShooters[(i + 5) % menShooters.length]);
  const women = shooters.filter((u) => u.gender === "FEMALE");
  for (let i = 0; i < women.length; i++) await book(subs[1].id, groupsByComp.get(subs[1].id)![4].id, women[i]);
  await prisma.event.update({ where: { id: ministry.id }, data: { participantSeq: seq } });

  // One unpaid cash order to demo "collect cash & check in"
  {
    const u = menShooters[menShooters.length - 1];
    const g = menOpenGroups[5];
    const slot = await prisma.slot.findFirst({ where: { groupId: g.id, state: "FREE", isLeftHand: u.hand === "LEFT" }, orderBy: { targetNo: "desc" } });
    if (slot && !(await prisma.slot.findFirst({ where: { groupId: g.id, userId: u.id } }))) {
      const order = await prisma.order.create({ data: { ref: "ORD-CASHDEMO", userId: u.id, total: 5, method: "CASH", status: "PENDING_CASH", deadlineAt: g.startsAt } });
      await prisma.slot.update({ where: { id: slot.id }, data: { state: "PENDING", userId: u.id, holdExpiresAt: g.startsAt } });
      await prisma.booking.create({ data: { userId: u.id, slotId: slot.id, groupId: g.id, competitionId: subs[0].id, orderId: order.id, targetNo: slot.targetNo, price: 5 } });
    }
  }

  // ---------- Draft event to demonstrate the admin workflow ----------
  const ds = day(30);
  const draft = await prisma.event.create({
    data: {
      slug: "national-day-cup-2026", nameEn: "National Day Cup 2026", nameAr: "كأس العيد الوطني ٢٠٢٦", location: "Nizwa — Traditional Range",
      season: 2026, startDate: ds, endDate: new Date(ds.getTime() + D), regOpensAt: new Date(), regClosesAt: muscat(new Date(ds.getTime() - D), 22), status: "DRAFT",
    },
  });
  await prisma.competition.create({ data: { eventId: draft.id, nameEn: "Individual 10 Shots", nameAr: "فردي ١٠ طلقات", shotsPerSeries: 10, targetsPerGroup: 10, leftHandTargets: [1], prices: [5, 3] } });

  if (forced) await prisma.auditLog.create({ data: { action: "demo.reseed", entity: "System", entityId: force!, reason: "Owner-requested demo refresh" } });
  console.log(`Seeded: ${shooters.length} shooters, ${leaves.length} competitions, ${seq} participants.`);
  console.log(`Admin 10000001 · Judge 10000002 · Reception 10000003 · Shooters 20000001–${20000000 + shooters.length}`);
  console.log(`Unused team cup id (for load test): ${team.id}`);
}

main().finally(() => prisma.$disconnect());
