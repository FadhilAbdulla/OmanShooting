import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffLoginForm } from "./staff-login-form";
import { DemoBanner } from "@/components/demo-banner";
import { getSession, hasRole, STAFF } from "@/lib/auth";
import { isDemo } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Separate entry point for committee staff — kept apart from the public shooter sign-in. */
export default async function StaffLogin() {
  if (hasRole(await getSession(), STAFF)) redirect("/admin");
  return (
    <div dir="ltr" className="heritage-bg flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sand-200">Committee console</div>
        <div className="w-full max-w-sm"><StaffLoginForm demo={isDemo()} /></div>
        <Link href="/" className="mt-6 text-sm text-sand-200 hover:text-white">← Back to the public site</Link>
      </div>
    </div>
  );
}
