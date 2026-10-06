import { z } from "zod";
import { dateOnly, muscatDateTime } from "./utils";

export const EventBody = z.object({
  nameEn: z.string().min(3), nameAr: z.string().min(2), descriptionEn: z.string().optional().nullable(), descriptionAr: z.string().optional().nullable(),
  location: z.string().min(2), startDate: z.string(), endDate: z.string(), regOpensAt: z.string(), regClosesAt: z.string(),
  holdMinutes: z.coerce.number().int().min(2).max(60).default(10), cancelHours: z.coerce.number().int().min(0).default(48),
  maxCancellations: z.coerce.number().int().min(0).default(2), paymentDeadlineHours: z.coerce.number().int().min(1).default(24),
  allowCash: z.boolean().default(true), allowTransfer: z.boolean().default(true),
});

export function eventData(d: z.infer<typeof EventBody>) {
  return {
    ...d, startDate: dateOnly(d.startDate), endDate: dateOnly(d.endDate), season: Number(d.startDate.slice(0, 4)),
    regOpensAt: muscatDateTime(d.regOpensAt.slice(0, 10), d.regOpensAt.slice(11, 16) || "00:00"),
    regClosesAt: muscatDateTime(d.regClosesAt.slice(0, 10), d.regClosesAt.slice(11, 16) || "23:59"),
  };
}

export const CompBody = z.object({
  nameEn: z.string().min(2), nameAr: z.string().min(1), firearm: z.string().default("Traditional rifle (Saktoun)"),
  genderRule: z.enum(["MALE", "FEMALE", "ANY"]), minAge: z.coerce.number().int().nullable().optional(), maxAge: z.coerce.number().int().nullable().optional(),
  format: z.enum(["INDIVIDUAL", "TEAM"]), teamSize: z.coerce.number().int().nullable().optional(),
  shotsPerSeries: z.coerce.number().int().min(1).max(50), seriesCount: z.coerce.number().int().min(1).max(10), maxScorePerShot: z.coerce.number().int().min(1).max(100).default(10),
  venueType: z.enum(["INDOOR_AC", "INDOOR", "OUTDOOR"]), targetsPerGroup: z.coerce.number().int().min(1).max(100),
  leftHandTargets: z.array(z.coerce.number().int()).default([]), enforceHand: z.boolean().default(true),
  prices: z.array(z.coerce.number().min(0)).min(1).max(10), maxParticipants: z.coerce.number().int().nullable().optional(),
  finalistsCount: z.coerce.number().int().min(1).max(50).default(8),
});

