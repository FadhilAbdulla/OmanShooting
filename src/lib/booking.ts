/**
 * Booking engine — the high-concurrency core.
 *
 * Design: every physical target in every group is a row in "Slot". Claiming a target is ONE atomic
 * compare-and-set statement:
 *
 *   UPDATE "Slot" SET state='HELD', "userId"=$me, "holdExpiresAt"=now()+10min
 *   WHERE id=$slot AND (state='FREE' OR (state='HELD' AND "holdExpiresAt" < now()))
 *
 * Postgres row locking guarantees that when N users hit the same target at the same instant exactly
 * one UPDATE matches; the others see 0 rows and get a 409 immediately — no long-held locks, no
 * retries, no queue, no double booking. Expired holds are treated as free *inside the predicate*,
 * so correctness never depends on the background sweeper running on time.
 * A unique index on (groupId, userId) additionally stops one shooter grabbing two targets in a group.
 */
import { Prisma, type PaymentMethod, type Slot } from "@prisma/client";
import { prisma } from "./db";
import { channels, publish } from "./realtime";
import { checkEligibility } from "./eligibility";
import { AppError, ref } from "./utils";
import { sendEmail, sendSms } from "./notify";
import { audit } from "./audit";
import { invoiceUrl, issueInvoice } from "./invoice";

type Tx = Prisma.TransactionClient;
const ACTIVE = ["PENDING_PAYMENT", "CONFIRMED"] as const;

function isUniqueViolation(e: unknown) {
  return (
    (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2002" || e.code === "P2010")) ||
    String((e as Error)?.message ?? "").includes("23505")
  );
}

async function notifySlots(groupIds: Iterable<string>) {
  await Promise.all([...new Set(groupIds)].map((g) => publish(channels.group(g))));
}

async function loadSlotContext(slotId: string) {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { group: { include: { competition: { include: { event: true } } } } },
  });
  if (!slot) throw new AppError("Target not found", 404);
  return slot;
}

/** Validates that `userId` may book in this event right now. Returns whether bookings are test bookings. */
export async function assertBookable(event: { status: string; regOpensAt: Date; regClosesAt: Date }, userId: string) {
  if (event.status === "DRAFT") {
    const admin = await prisma.userRole.count({ where: { userId, role: "ADMIN" } });
    if (!admin) throw new AppError("This event is not published yet", 403);
    return { isTest: true };
  }
  if (event.status !== "PUBLISHED") throw new AppError("Registration for this event is closed", 409);
  const now = new Date();
  if (now < event.regOpensAt) throw new AppError("Registration has not opened yet", 409);
  if (now > event.regClosesAt) throw new AppError("Registration has closed", 409);
  return { isTest: false };
}

export async function claimSlot(userId: string, slotId: string) {
  const slot = await loadSlotContext(slotId);
  const { group } = slot;
  const comp = group.competition;
  await assertBookable(comp.event, userId);
  if (group.isFinal) throw new AppError("Final groups are allocated automatically", 409);
  if (group.startsAt < new Date()) throw new AppError("This group has already started", 409);
  if (slot.state === "BLOCKED") throw new AppError("This target is not available", 409);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const elig = checkEligibility(user, comp, comp.event.startDate);
  if (!elig.ok) throw new AppError(elig.reason!, 403, "INELIGIBLE");
  if (comp.enforceHand && slot.isLeftHand !== (user.hand === "LEFT")) {
    throw new AppError(slot.isLeftHand ? "This target is reserved for left-handed shooters" : "Please choose a left-hand target (marked L)", 403, "HAND");
  }

  // An unpaid order whose deadline passed shows as free on the board — expire it now instead of
  // making the shooter wait for the sweeper.
  if (slot.state === "PENDING" && slot.holdExpiresAt && slot.holdExpiresAt < new Date()) {
    const stale = await prisma.booking.findFirst({ where: { slotId, status: "PENDING_PAYMENT" }, select: { orderId: true } });
    if (stale?.orderId) await failOrder(stale.orderId, "EXPIRED", null, "Payment deadline passed");
  }

  const maxAttempts = comp.maxAttempts;
  const holdMinutes = comp.event.holdMinutes;
  try {
    const claimed = await prisma.$transaction(async (tx) => {
      // Serialise this shooter's own claims (double taps, several tabs) so the attempt limit can't be raced.
      // Different shooters never wait on each other here.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"user:" + userId}))`;

      const existing = await tx.slot.findFirst({ where: { groupId: group.id, userId, state: { in: ["PENDING", "BOOKED"] } } });
      if (existing) throw new AppError(`You already have target ${existing.targetNo} in this group`, 409, "ALREADY_BOOKED");

      // Attempt policy is configured independently from tiered pricing. When no maximum is set,
      // shooters may re-enter and the final configured price tier continues to apply.
      const [activeBookings, otherHolds] = await Promise.all([
        tx.booking.count({ where: { userId, competitionId: comp.id, status: { in: [...ACTIVE] } } }),
        tx.slot.count({ where: { userId, state: "HELD", holdExpiresAt: { gt: new Date() }, groupId: { not: group.id }, group: { competitionId: comp.id } } }),
      ]);
      if (maxAttempts != null && activeBookings + otherHolds >= maxAttempts) {
        throw new AppError(`Maximum ${maxAttempts} ${maxAttempts === 1 ? "attempt" : "attempts"} allowed in this competition`, 409, "MAX_ATTEMPTS");
      }

      // Competition-wide cap on distinct shooters (only serialises claims when a cap is configured)
      if (comp.maxParticipants) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"comp:" + comp.id}))`;
        const [{ n, mine }] = await tx.$queryRaw<{ n: number; mine: boolean }[]>`
          SELECT COUNT(DISTINCT u)::int AS n, bool_or(u = ${userId}) AS mine FROM (
            SELECT b."userId" AS u FROM "Booking" b WHERE b."competitionId" = ${comp.id} AND b.status IN ('PENDING_PAYMENT','CONFIRMED')
            UNION
            SELECT s."userId" FROM "Slot" s JOIN "Group" g ON g.id = s."groupId"
             WHERE g."competitionId" = ${comp.id} AND s.state = 'HELD' AND s."holdExpiresAt" > now()
          ) x`;
        if (!mine && n >= comp.maxParticipants) throw new AppError("This competition is full", 409, "FULL");
      }

      // One-tap switching: release any target this user is holding in the same group
      await tx.slot.updateMany({
        where: { groupId: group.id, userId, state: "HELD", id: { not: slotId } },
        data: { state: "FREE", userId: null, holdExpiresAt: null, version: { increment: 1 } },
      });

      const rows = await tx.$queryRaw<Slot[]>`
        UPDATE "Slot"
           SET state = 'HELD', "userId" = ${userId},
               "holdExpiresAt" = now() + make_interval(mins => ${holdMinutes}::int),
               version = version + 1, "updatedAt" = now()
         WHERE id = ${slotId}
           AND (state = 'FREE' OR (state = 'HELD' AND ("holdExpiresAt" < now() OR "userId" = ${userId})))
     RETURNING *`;
      if (rows.length === 0) throw new AppError("Sorry — someone just took this target. Please pick another.", 409, "TAKEN");
      return rows[0];
    });
    await notifySlots([group.id]);
    return claimed;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("You already hold a target in this group", 409, "ALREADY_HELD");
    throw e;
  }
}

export async function releaseSlot(userId: string, slotId: string) {
  const r = await prisma.slot.updateMany({
    where: { id: slotId, userId, state: "HELD" },
    data: { state: "FREE", userId: null, holdExpiresAt: null, version: { increment: 1 } },
  });
  const s = await prisma.slot.findUnique({ where: { id: slotId }, select: { groupId: true } });
  if (r.count && s) await notifySlots([s.groupId]);
  return r.count > 0;
}

function priceFor(prices: Prisma.Decimal[], attemptNo: number) {
  if (!prices.length) return new Prisma.Decimal(0);
  // TOUR-03: after the listed tiers, keep charging the final tier unless maxAttempts blocks re-entry.
  return prices[Math.min(attemptNo, prices.length) - 1];
}

export async function getCart(userId: string) {
  const slots = await prisma.slot.findMany({
    where: { userId, state: "HELD", holdExpiresAt: { gt: new Date() } },
    include: { group: { include: { competition: { include: { event: true } } } } },
    orderBy: [{ group: { startsAt: "asc" } }],
  });
  const compIds = [...new Set(slots.map((s) => s.group.competitionId))];
  const counts = await prisma.booking.groupBy({
    by: ["competitionId"],
    where: { userId, competitionId: { in: compIds }, status: { in: [...ACTIVE] } },
    _count: true,
  });
  const used = new Map(counts.map((c) => [c.competitionId, c._count]));
  const items = slots.map((s) => {
    const c = s.group.competition;
    const attemptNo = (used.get(c.id) ?? 0) + 1;
    used.set(c.id, attemptNo);
    return { slot: s, attemptNo, price: priceFor(c.prices, attemptNo) };
  });
  const total = items.reduce((a, i) => a.add(i.price), new Prisma.Decimal(0));
  return { items, total };
}

export async function checkout(userId: string, method: PaymentMethod, receipt?: string | null) {
  const result = await prisma.$transaction(async (tx) => {
    // Lock the shooter's live holds so a concurrent sweep/checkout cannot touch them
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Slot" WHERE "userId" = ${userId} AND state = 'HELD' AND "holdExpiresAt" > now() FOR UPDATE`;
    if (!locked.length) throw new AppError("Your cart is empty or your hold expired", 409, "CART_EMPTY");

    const { items, total } = await getCartTx(tx, userId, locked.map((l) => l.id));
    const events = new Map(items.map((i) => [i.slot.group.competition.event.id, i.slot.group.competition.event]));
    const testFlags = new Set([...events.values()].map((e) => e.status === "DRAFT"));
    if (testFlags.size > 1) throw new AppError("Test (draft) and live bookings cannot be paid together", 409);
    const isTest = testFlags.has(true);

    const effectiveMethod: PaymentMethod = total.isZero() ? "FREE" : method;
    if (effectiveMethod === "CASH" && [...events.values()].some((e) => !e.allowCash)) throw new AppError("Cash is not accepted for this event");
    if (effectiveMethod === "BANK_TRANSFER") {
      if ([...events.values()].some((e) => !e.allowTransfer)) throw new AppError("Bank transfer is not accepted for this event");
      if (!receipt) throw new AppError("Please upload the transfer receipt");
    }

    const now = Date.now();
    const firstStart = Math.min(...items.map((i) => i.slot.group.startsAt.getTime()));
    const deadlineHours = Math.min(...[...events.values()].map((e) => e.paymentDeadlineHours));
    const holdMinutes = Math.min(...[...events.values()].map((e) => e.holdMinutes));
    const deadline =
      effectiveMethod === "THAWANI" ? new Date(now + holdMinutes * 60_000)
      : effectiveMethod === "CASH" ? new Date(Math.min(now + deadlineHours * 3_600_000, firstStart))
      : null; // transfers wait for admin review; FREE is immediate

    const status = { THAWANI: "PENDING", CASH: "PENDING_CASH", BANK_TRANSFER: "PENDING_REVIEW", FREE: "PAID" }[effectiveMethod] as never;
    const order = await tx.order.create({
      data: { ref: ref("ORD"), userId, total, method: effectiveMethod, status, receipt: receipt ?? null, deadlineAt: deadline, isTest },
    });
    for (const i of items) {
      await tx.booking.create({
        data: {
          userId, slotId: i.slot.id, groupId: i.slot.groupId, competitionId: i.slot.group.competitionId,
          orderId: order.id, targetNo: i.slot.targetNo, attemptNo: i.attemptNo, price: i.price, isTest,
        },
      });
    }
    await tx.slot.updateMany({
      where: { id: { in: items.map((i) => i.slot.id) } },
      data: { state: "PENDING", holdExpiresAt: deadline, version: { increment: 1 } },
    });
    return { order, groupIds: items.map((i) => i.slot.groupId) };
  });

  await notifySlots(result.groupIds);
  if (result.order.status === "PAID") await confirmOrder(result.order.id, null);
  return result.order;
}

async function getCartTx(tx: Tx, userId: string, slotIds: string[]) {
  const slots = await tx.slot.findMany({
    where: { id: { in: slotIds } },
    include: { group: { include: { competition: { include: { event: true } } } } },
    orderBy: { group: { startsAt: "asc" } },
  });
  const counts = await tx.booking.groupBy({
    by: ["competitionId"],
    where: { userId, competitionId: { in: slots.map((s) => s.group.competitionId) }, status: { in: [...ACTIVE] } },
    _count: true,
  });
  const used = new Map(counts.map((c) => [c.competitionId, c._count]));
  const items = slots.map((s) => {
    const c = s.group.competition;
    const attemptNo = (used.get(c.id) ?? 0) + 1;
    used.set(c.id, attemptNo);
    return { slot: s, attemptNo, price: priceFor(c.prices, attemptNo) };
  });
  return { items, total: items.reduce((a, i) => a.add(i.price), new Prisma.Decimal(0)) };
}

/** Participant number is per event and reused across that shooter's competitions in the event. */
async function participantNo(tx: Tx, userId: string, eventId: string) {
  const prev = await tx.booking.findFirst({
    where: { userId, participantNo: { not: null }, competition: { eventId } },
    select: { participantNo: true },
  });
  if (prev?.participantNo) return prev.participantNo;
  const [row] = await tx.$queryRaw<{ participantSeq: number }[]>`
    UPDATE "Event" SET "participantSeq" = "participantSeq" + 1 WHERE id = ${eventId} RETURNING "participantSeq"`;
  return row.participantSeq;
}

export async function confirmOrder(orderId: string, actorId: string | null, note?: string, opts?: { gatewayPaid?: boolean }) {
  const res = await prisma.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT id, status FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (!order) throw new AppError("Order not found", 404);
    if (order.status === "PAID" || order.status === "REFUND_DUE") return null; // idempotent (gateway callbacks can repeat)
    const late = !["PENDING", "PENDING_CASH", "PENDING_REVIEW"].includes(order.status);
    if (late && !actorId && !opts?.gatewayPaid) throw new AppError("Order is no longer payable", 409);

    const bookings = await tx.booking.findMany({ where: { orderId }, include: { competition: true, slot: true } });
    if (late) {
      // Money arrived after the booking expired (slow gateway, or a late manual approval).
      // Re-take the targets if they are still free; otherwise flag the order for a refund.
      const ids = bookings.map((b) => b.slotId).filter((x): x is string => !!x);
      const locked = await tx.$queryRaw<{ id: string; state: string; userId: string | null; holdExpiresAt: Date | null }[]>`
        SELECT id, state::text, "userId", "holdExpiresAt" FROM "Slot" WHERE id = ANY(${ids}) FOR UPDATE`;
      const byId = new Map(locked.map((l) => [l.id, l]));
      const lost = bookings.find((b) => {
        const l = b.slotId ? byId.get(b.slotId) : undefined;
        if (!l) return true;
        const expiredHold = l.state === "HELD" && l.holdExpiresAt && l.holdExpiresAt < new Date();
        return !(l.userId === b.userId || l.state === "FREE" || expiredHold);
      });
      if (lost) {
        await tx.order.update({ where: { id: orderId }, data: { status: "REFUND_DUE", paidAt: new Date(), reviewNote: `Paid after expiry; target ${lost.targetNo} was resold` } });
        await audit(actorId, "payment.refundDue", "Order", orderId, { targetNo: lost.targetNo }, undefined, tx);
        return { refund: true as const };
      }
      await tx.slot.updateMany({ where: { id: { in: ids } }, data: { state: "PENDING", holdExpiresAt: null } });
      for (const b of bookings) if (b.slotId) await tx.slot.update({ where: { id: b.slotId }, data: { userId: b.userId } });
    } else {
      for (const b of bookings) {
        if (!b.slot || b.slot.userId !== b.userId) throw new AppError(`Target ${b.targetNo} is no longer reserved for this shooter`, 409);
      }
    }
    for (const b of bookings) {
      await tx.booking.update({
        where: { id: b.id },
        data: { status: "CONFIRMED", participantNo: await participantNo(tx, b.userId, b.competition.eventId) },
      });
    }
    await tx.slot.updateMany({
      where: { id: { in: bookings.map((b) => b.slotId!).filter(Boolean) } },
      data: { state: "BOOKED", holdExpiresAt: null, version: { increment: 1 } },
    });
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), reviewedById: actorId, reviewNote: note },
      include: { user: true },
    });
    await issueInvoice(tx, orderId);
    if (actorId) await audit(actorId, "payment.approve", "Order", orderId, { ref: updated.ref }, note, tx);
    return { order: updated, groupIds: bookings.map((b) => b.groupId) };
  });
  if (!res) return;
  if ("refund" in res) {
    await publish(channels.admin, { type: "payment" });
    return;
  }
  await notifySlots(res.groupIds);
  await publish(channels.admin, { type: "payment" });
  // The electronic invoice is delivered with the confirmation (test orders have none)
  const invoice = res.order.isTest ? "" : ` Invoice: ${invoiceUrl(res.order.id)}`;
  await sendSms(res.order.user.mobile, `Your booking ${res.order.ref} is confirmed. Total ${res.order.total} OMR.${invoice}`);
  await sendEmail(res.order.user.email, "Booking confirmed", `Order ${res.order.ref} is confirmed.${invoice}`);
}

export async function failOrder(orderId: string, status: "REJECTED" | "CANCELLED" | "EXPIRED", actorId: string | null, note?: string) {
  const res = await prisma.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT id, status FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (!order || !["PENDING", "PENDING_CASH", "PENDING_REVIEW"].includes(order.status)) return null;
    const bookings = await tx.booking.findMany({ where: { orderId } });
    await tx.booking.updateMany({
      where: { orderId },
      data: { status: status === "EXPIRED" ? "EXPIRED" : "CANCELLED", cancelledAt: new Date() },
    });
    for (const b of bookings) {
      if (!b.slotId) continue;
      await tx.slot.updateMany({
        where: { id: b.slotId, userId: b.userId, state: "PENDING" },
        data: { state: "FREE", userId: null, holdExpiresAt: null, version: { increment: 1 } },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status, reviewedById: actorId, reviewNote: note } });
    if (actorId) await audit(actorId, `payment.${status.toLowerCase()}`, "Order", orderId, {}, note, tx);
    return bookings.map((b) => b.groupId);
  });
  if (res) {
    await notifySlots(res);
    await publish(channels.admin, { type: "payment" });
  }
}

/** Cancellation by shooter (BOOK-08 policy) or by staff (no policy limits). */
export async function cancelBooking(bookingId: string, actorId: string, isStaff: boolean, reason?: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { group: true, competition: { include: { event: true } }, order: true },
  });
  if (!b) throw new AppError("Booking not found", 404);
  if (!isStaff && b.userId !== actorId) throw new AppError("Not allowed", 403);
  if (!["PENDING_PAYMENT", "CONFIRMED"].includes(b.status)) throw new AppError("Booking is not active", 409);
  if (b.total != null) throw new AppError("A score has been recorded for this booking", 409);
  const ev = b.competition.event;
  if (!isStaff) {
    const hoursLeft = (b.group.startsAt.getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < ev.cancelHours) throw new AppError(`Cancellations close ${ev.cancelHours} hours before the group starts`, 409);
    // Only the shooter's own cancellations count — not abandoned payments, staff actions or replacements
    const used = await prisma.booking.count({ where: { userId: b.userId, selfCancelled: true, competition: { eventId: ev.id } } });
    if (used >= ev.maxCancellations) throw new AppError(`You have reached the limit of ${ev.maxCancellations} cancellations for this event`, 409);
  }
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledAt: new Date(), selfCancelled: !isStaff } });
    if (b.slotId) {
      await tx.slot.updateMany({
        where: { id: b.slotId, userId: b.userId },
        data: { state: "FREE", userId: null, holdExpiresAt: null, version: { increment: 1 } },
      });
    }
    // If every booking in a pending order is gone, close the order too
    if (b.orderId && b.order && b.order.status !== "PAID") {
      const left = await tx.booking.count({ where: { orderId: b.orderId, status: { in: [...ACTIVE] } } });
      if (!left) await tx.order.update({ where: { id: b.orderId }, data: { status: "CANCELLED" } });
    }
    await audit(actorId, "booking.cancel", "Booking", b.id, { staff: isStaff }, reason, tx);
  });
  await notifySlots([b.groupId]);
}

/** TOUR-15e: move a booking to another target / group / date. Atomic: the old target is only released if the new one is won. */
export async function moveBooking(bookingId: string, newSlotId: string, actorId: string, isStaff: boolean) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { slot: true, group: true, competition: { include: { event: true } } } });
  if (!b || !b.slot) throw new AppError("Booking not found", 404);
  if (!isStaff && b.userId !== actorId) throw new AppError("Not allowed", 403);
  if (!["PENDING_PAYMENT", "CONFIRMED"].includes(b.status) || b.total != null) throw new AppError("This booking can no longer be changed", 409);
  const target = await loadSlotContext(newSlotId);
  if (target.group.competitionId !== b.competitionId) throw new AppError("You can only move within the same competition", 409);
  if (target.group.isFinal || b.group.isFinal) throw new AppError("Final groups cannot be changed here", 409);
  if (target.group.startsAt < new Date()) throw new AppError("That group has already started", 409);
  if (target.state === "BLOCKED") throw new AppError("That target is not available", 409);
  if (!isStaff && (b.group.startsAt.getTime() - Date.now()) / 3_600_000 < b.competition.event.cancelHours) {
    throw new AppError(`Changes close ${b.competition.event.cancelHours} hours before the group starts`, 409);
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: b.userId } });
  if (!isStaff && b.competition.enforceHand && target.isLeftHand !== (user.hand === "LEFT")) throw new AppError("Target does not match dominant hand", 403);

  const state = b.slot.state; // PENDING or BOOKED carries over
  try {
    await prisma.$transaction(async (tx) => {
      await tx.slot.update({ where: { id: b.slot!.id }, data: { state: "FREE", userId: null, holdExpiresAt: null, version: { increment: 1 } } });
      const rows = await tx.$queryRaw<Slot[]>`
        UPDATE "Slot" SET state = ${state}::"SlotState", "userId" = ${b.userId}, "holdExpiresAt" = ${b.slot!.holdExpiresAt},
               version = version + 1, "updatedAt" = now()
         WHERE id = ${newSlotId} AND (state = 'FREE' OR (state = 'HELD' AND "holdExpiresAt" < now()))
     RETURNING *`;
      if (!rows.length) throw new AppError("That target was just taken", 409, "TAKEN");
      await tx.booking.update({ where: { id: b.id }, data: { slotId: newSlotId, groupId: target.groupId, targetNo: target.targetNo } });
      await audit(actorId, "booking.move", "Booking", b.id, { from: `${b.groupId}#${b.targetNo}`, to: `${target.groupId}#${target.targetNo}` }, undefined, tx);
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("Shooter already has a target in that group", 409);
    throw e;
  }
  await notifySlots([b.groupId, target.groupId]);
}

/**
 * Check-in desk: give a target to a shooter on the spot (walk-in on a free target, or replacing an
 * absent shooter — TOUR-10: only allowed when the absent shooter has no score). Cash is recorded as paid.
 */
export async function staffAssign(slotId: string, civilId: string, actorId: string, replaceBookingId?: string) {
  const slot = await loadSlotContext(slotId);
  const user = await prisma.user.findUnique({ where: { civilId } });
  if (!user) throw new AppError("No member with that civil ID — ask them to register first", 404);
  const comp = slot.group.competition;
  const elig = checkEligibility(user, comp, comp.event.startDate);
  if (!elig.ok) throw new AppError(elig.reason!, 403);
  const isTest = comp.event.status === "DRAFT";

  await prisma.$transaction(async (tx) => {
    if (replaceBookingId) {
      const old = await tx.booking.findUnique({ where: { id: replaceBookingId } });
      if (!old || old.slotId !== slotId) throw new AppError("Booking does not belong to this target", 409);
      if (old.total != null || old.series.length) throw new AppError("Cannot replace: a score is already recorded", 409);
      if (old.attendance === "PRESENT") throw new AppError("Shooter is checked in — mark absent first", 409);
      await tx.booking.update({ where: { id: old.id }, data: { status: "CANCELLED", attendance: "ABSENT", cancelledAt: new Date() } });
      await tx.slot.update({ where: { id: slotId }, data: { state: "FREE", userId: null, holdExpiresAt: null } });
      await audit(actorId, "booking.replace", "Booking", old.id, { replacement: civilId }, "Absent shooter replaced", tx);
    }
    const rows = await tx.$queryRaw<Slot[]>`
      UPDATE "Slot" SET state = 'BOOKED', "userId" = ${user.id}, "holdExpiresAt" = NULL, version = version + 1, "updatedAt" = now()
       WHERE id = ${slotId} AND (state = 'FREE' OR (state = 'HELD' AND "holdExpiresAt" < now()))
   RETURNING *`;
    if (!rows.length) throw new AppError("Target is not free", 409, "TAKEN");
    const prior = await tx.booking.count({ where: { userId: user.id, competitionId: comp.id, status: { in: [...ACTIVE] } } });
    if (comp.maxAttempts != null && prior >= comp.maxAttempts) {
      throw new AppError(`Maximum ${comp.maxAttempts} ${comp.maxAttempts === 1 ? "attempt" : "attempts"} allowed in this competition`, 409, "MAX_ATTEMPTS");
    }
    const price = priceFor(comp.prices, prior + 1);
    const order = await tx.order.create({
      data: { ref: ref("ORD"), userId: user.id, total: price, method: price.isZero() ? "FREE" : "CASH", status: "PAID", paidAt: new Date(), reviewedById: actorId, reviewNote: "On-site at check-in", isTest },
    });
    await issueInvoice(tx, order.id);
    await tx.booking.create({
      data: {
        userId: user.id, slotId, groupId: slot.groupId, competitionId: comp.id, orderId: order.id, targetNo: slot.targetNo,
        attemptNo: prior + 1, price, status: "CONFIRMED", isTest, attendance: "PRESENT", checkedInAt: new Date(), checkedInBy: actorId,
        participantNo: await participantNo(tx, user.id, comp.eventId),
      },
    });
    await audit(actorId, "booking.walkin", "Slot", slotId, { civilId, price: price.toString() }, undefined, tx);
  }).catch((e) => {
    if (isUniqueViolation(e)) throw new AppError("This shooter already has a target in this group", 409);
    throw e;
  });
  await notifySlots([slot.groupId]);
}

/** Housekeeping: expire stale holds and unpaid orders (PAY-05). Safe to run on any number of instances. */
export async function sweep() {
  const freed = await prisma.$queryRaw<{ groupId: string }[]>`
    UPDATE "Slot" SET state = 'FREE', "userId" = NULL, "holdExpiresAt" = NULL, version = version + 1, "updatedAt" = now()
     WHERE state = 'HELD' AND "holdExpiresAt" < now()
 RETURNING "groupId"`;
  const stale = await prisma.order.findMany({
    where: { status: { in: ["PENDING", "PENDING_CASH"] }, deadlineAt: { lt: new Date() } },
    select: { id: true },
    take: 200,
  });
  for (const o of stale) await failOrder(o.id, "EXPIRED", null, "Payment deadline passed");
  if (freed.length) await notifySlots(freed.map((f) => f.groupId));
  return { freedHolds: freed.length, expiredOrders: stale.length };
}
