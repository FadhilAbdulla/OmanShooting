import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyTemp } from "@/lib/session";
import { isDemo, safeNext } from "@/lib/utils";
import { Onboarding } from "./wizard";

export const dynamic = "force-dynamic";

/** New-shooter onboarding: reached only after the civil ID has been verified by OTP. */
export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const tmp = await verifyTemp<{ civilId: string }>((await cookies()).get("reg")?.value);
  const next = safeNext((await searchParams).next);
  if (!tmp) redirect(`/login?next=${encodeURIComponent(next)}`);
  return <Onboarding civilId={tmp.civilId} next={next} demo={isDemo()} />;
}
