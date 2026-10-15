import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { shooterProfile } from "@/lib/profile";
import { ShooterProfile } from "@/components/shooter-profile";

export const dynamic = "force-dynamic";

/** Staff view of a shooter's full profile (unmasked personal data). */
export default async function MemberProfile({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const p = await shooterProfile((await params).id);
  if (!p) notFound();
  return (
    <div className="space-y-3">
      <Link href="/admin/users" className="text-sm text-stone-500 hover:underline">← Shooters</Link>
      <ShooterProfile p={p} staffView />
    </div>
  );
}
