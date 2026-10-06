import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, IDLE_MINUTES, signSession, verifySession } from "@/lib/session";

const REFRESH_AFTER_S = 5 * 60;

/**
 * MEM-12: sliding idle timeout. Activity re-issues the session cookie (at most every 5 minutes, so bursts
 * of booking API calls don't each pay for a re-sign); inactivity lets it lapse. An absolute lifetime is
 * enforced in verifySession.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();
  const s = await verifySession(token);
  const res = NextResponse.next();
  if (!s) {
    res.cookies.delete(SESSION_COOKIE);
  } else if (!s.iat || Date.now() / 1000 - s.iat > REFRESH_AFTER_S) {
    res.cookies.set(SESSION_COOKIE, await signSession(s), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: IDLE_MINUTES * 60,
    });
  }
  return res;
}

export const config = { matcher: ["/((?!api/stream|_next/static|_next/image|images/|favicon.ico).*)"] };
