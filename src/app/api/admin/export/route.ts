import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { handle } from "@/lib/api";
import { leaderboard } from "@/lib/scoring";
import { fmtDateTime } from "@/lib/utils";

// Neutralise spreadsheet formula injection: text starting with = + - @ (or tab/CR) is prefixed with '
const cell = (v: string | number | null | undefined) => {
  let s = String(v ?? "");
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
// UTF-8 BOM so Excel opens Arabic correctly
const csv = (rows: (string | number | null | undefined)[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** TOUR-16: Excel-compatible exports (UTF-8 BOM so Arabic opens correctly in Excel). */
export const GET = handle(async (req: Request) => {
  await requireApiRole(["ADMIN", "JUDGE", "RECEPTION"]);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "bookings";
  const competitionId = url.searchParams.get("competitionId");
  const eventId = url.searchParams.get("eventId");
  let body: string;
  let name: string;
  if (type === "results" && competitionId) {
    const { rows, comp } = await leaderboard(competitionId);
    body = csv([["Rank", "Participant #", "Name", "Governorate", "Qualification", "X", "Final", "Combined"], ...rows.map((r) => [r.rank, r.participantNo, r.name, r.governorate, r.qual, r.qualX, r.final, r.combined])]);
    name = `results-${comp.nameEn}`;
  } else {
    const bookings = await prisma.booking.findMany({
      where: { ...(competitionId ? { competitionId } : {}), ...(eventId ? { competition: { eventId } } : {}), status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
      include: { user: true, group: true, competition: true, order: true },
      orderBy: [{ group: { startsAt: "asc" } }, { targetNo: "asc" }],
    });
    body = csv([
      ["Competition", "Group", "Starts", "Target", "Participant #", "Name", "Civil ID", "Mobile", "Hand", "Status", "Payment", "Price", "Attendance", "Score", "Test"],
      ...bookings.map((b) => [b.competition.nameEn, b.group.label, fmtDateTime(b.group.startsAt), b.targetNo, b.participantNo, b.user.fullName, b.user.civilId, b.user.mobile, b.user.hand, b.status, b.order?.method, b.price.toString(), b.attendance, b.total, b.isTest ? "yes" : ""]),
    ]);
    name = "bookings";
  }
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}.csv"` },
  });
});
