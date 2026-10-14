export const TZ = "Asia/Muscat";
const MUSCAT_OFFSET_H = 4;

export function omr(v: unknown) {
  const n = Number(v ?? 0);
  return `${n.toFixed(3)} OMR`;
}

/** Combine a YYYY-MM-DD date and HH:MM local Muscat time into a UTC Date. */
export function muscatDateTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - MUSCAT_OFFSET_H, mi));
}

export function dateOnly(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function fmtDate(d: Date | string, locale = "en") {
  return new Date(d).toLocaleDateString(locale === "ar" ? "ar-OM" : "en-GB", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

export function fmtTime(d: Date | string, locale = "en") {
  return new Date(d).toLocaleTimeString(locale === "ar" ? "ar-OM" : "en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDateTime(d: Date | string, locale = "en") {
  return `${fmtDate(d, locale)} ${fmtTime(d, locale)}`;
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 60) || "event";
}

export function ageOn(dob: Date | null | undefined, on: Date) {
  if (!dob) return null;
  let a = on.getUTCFullYear() - dob.getUTCFullYear();
  const m = on.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < dob.getUTCDate())) a--;
  return a;
}

export function ref(prefix: string) {
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${t}${r}`;
}

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const CODES: Record<number, string> = { 400: "BAD_REQUEST", 401: "UNAUTHENTICATED", 402: "PAYMENT_REQUIRED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 422: "VALIDATION", 423: "LOCKED", 429: "RATE_LIMITED" };

export class AppError extends Error {
  public code: string;
  constructor(message: string, public status = 400, code?: string) {
    super(message);
    this.code = code ?? CODES[status] ?? "ERROR";
  }
}

/**
 * Demo conveniences (OTP shown on screen, sandbox payment page, demo banner) are ON by default for this MVP,
 * so any deployment works without extra configuration. Set DEMO_MODE=0 for a real launch (after an SMS
 * provider and Thawani keys are configured).
 */
export function isDemo() {
  return !["0", "false", "off"].includes((process.env.DEMO_MODE ?? "").toLowerCase());
}

/** Only allow same-site relative redirects (prevents open-redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** Accept only image (and optionally PDF) data URLs for uploads. */
export function isSafeDataUrl(v: string, allowPdf = false) {
  return /^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,[A-Za-z0-9+/=]+$/.test(v) || (allowPdf && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(v));
}
