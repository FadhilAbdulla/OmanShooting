import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MemberCard } from "@/components/member-card";
import { LinkButton } from "@/components/ui";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Final onboarding step: the new member's digital card and the obvious next action. */
export default async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.uid } });
  const next = safeNext((await searchParams).next);
  const continuing = next !== "/" && next !== "/me";
  return (
    <div className="mx-auto max-w-2xl py-4">
      <ol className="mb-6 flex items-center gap-1 text-xs">
        {["Civil ID verified", "Scan ID card", "Your details", "Photo", "Membership card"].map((l, i) => (
          <li key={l} className="flex flex-1 flex-col items-center gap-1 text-center">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${i < 4 ? "border-oasis-500 bg-oasis-500 text-white" : "border-brand-500 bg-brand-500 text-white"}`}>{i < 4 ? "✓" : 5}</span>
            <span className={`hidden sm:block ${i === 4 ? "font-semibold" : "text-stone-500"}`}>{l}</span>
          </li>
        ))}
      </ol>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <h1 className="text-2xl font-bold">Welcome, {user.fullName.split(" ")[0]}!</h1>
        <p className="mt-1 text-stone-600">Your membership is active. This is your digital membership card — you&apos;ll show its QR code at the check-in desk.</p>
      </div>
      <div className="mx-auto mt-6 max-w-sm"><MemberCard user={user} /></div>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <LinkButton href={continuing ? next : "/#championships"} size="lg">{continuing ? "Continue to choose your target →" : "Book your first target →"}</LinkButton>
        <LinkButton href="/me" size="lg" variant="secondary">Go to My bookings</LinkButton>
      </div>
      <p className="mt-6 text-center text-xs text-stone-500">Your card is always available under <b>My bookings</b>. Tip: add this site to your phone&apos;s home screen for quick access on competition day.</p>
    </div>
  );
}
