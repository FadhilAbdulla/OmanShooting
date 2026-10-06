import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = { uid: string; roles: string[]; name: string; authAt: number; iat?: number };

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("SESSION_SECRET must be set in production");
}
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me-please-32chars!!");
export const SESSION_COOKIE = "session";
// MEM-12: idle timeout — the cookie is re-issued on activity by middleware
export const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 60);
// Absolute lifetime: a session can be kept alive by activity for at most this long, then the user signs in again
export const MAX_SESSION_HOURS = Number(process.env.SESSION_MAX_HOURS || 12);

export async function signSession(p: SessionPayload) {
  const { uid, roles, name, authAt } = p;
  return new SignJWT({ uid, roles, name, authAt }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${IDLE_MINUTES}m`).sign(secret);
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const p = payload as unknown as SessionPayload;
    if (!p.authAt || Date.now() - p.authAt > MAX_SESSION_HOURS * 3_600_000) return null;
    return p;
  } catch {
    return null;
  }
}

export async function signTemp(data: Record<string, unknown>, minutes = 15) {
  return new SignJWT(data).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${minutes}m`).sign(secret);
}

export async function verifyTemp<T>(token?: string | null): Promise<T | null> {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret)).payload as T;
  } catch {
    return null;
  }
}
