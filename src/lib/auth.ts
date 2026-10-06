import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, IDLE_MINUTES, signSession, verifySession, type SessionPayload } from "./session";
import { AppError } from "./utils";

export async function getSession() {
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value);
}

export async function startSession(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: true } });
  const payload: SessionPayload = { uid: user.id, name: user.fullName, roles: user.roles.map((r) => r.role), authAt: Date.now() };
  const c = await cookies();
  c.set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: IDLE_MINUTES * 60,
  });
  return payload;
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const STAFF = ["ADMIN", "JUDGE", "RECEPTION"];

export function hasRole(s: SessionPayload | null, roles: string[]) {
  return !!s && s.roles.some((r) => roles.includes(r));
}

/** For pages: redirect when unauthorised. Roles come from the DB so a revoked role takes effect immediately. */
export async function requirePageRole(roles: string[] | null, next = "/") {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  const live = (await prisma.userRole.findMany({ where: { userId: s.uid }, select: { role: true } })).map((r) => r.role as string);
  if (roles && !live.some((r) => roles.includes(r))) redirect("/");
  return { ...s, roles: live };
}

/** For API routes / actions: throw. Roles are re-read from DB so revocations apply immediately. */
export async function requireApiRole(roles: string[] | null) {
  const s = await getSession();
  if (!s) throw new AppError("Please sign in", 401, "UNAUTHENTICATED");
  if (roles) {
    const n = await prisma.userRole.count({ where: { userId: s.uid, role: { in: roles as never[] } } });
    if (!n) throw new AppError("Not allowed", 403, "FORBIDDEN");
  }
  return s;
}
