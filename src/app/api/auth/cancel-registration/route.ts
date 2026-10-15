import { cookies } from "next/headers";
import { ok } from "@/lib/api";

export async function POST() {
  (await cookies()).delete("reg");
  return ok();
}
