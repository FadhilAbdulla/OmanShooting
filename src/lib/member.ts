import { createHmac } from "crypto";

const key = process.env.SESSION_SECRET || "dev-secret-change-me-please-32chars!!";

function sig(memberNo: number) {
  return createHmac("sha256", key).update(`member:${memberNo}`).digest("base64url").slice(0, 10);
}

/** Token printed in the membership QR: "M123.<signature>". Unsigned member numbers can't be enumerated. */
export function memberToken(memberNo: number) {
  return `M${memberNo}.${sig(memberNo)}`;
}

export function parseMemberToken(raw: string): number | null {
  const m = raw.trim().match(/M(\d+)\.([\w-]{10})\s*$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return sig(n) === m[2] ? n : null;
}
