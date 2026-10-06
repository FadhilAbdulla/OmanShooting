import { cookies } from "next/headers";
import { ok } from "@/lib/api";

export async function POST(req: Request) {
  const { locale } = await req.json();
  (await cookies()).set("locale", locale === "ar" ? "ar" : "en", { path: "/", maxAge: 31536000 });
  return ok();
}
