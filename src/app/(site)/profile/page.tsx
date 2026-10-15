import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { shooterProfile } from "@/lib/profile";
import { ShooterProfile } from "@/components/shooter-profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile · Oman Traditional Shooting" };

/** The shooter's own digital profile (MEM-08). */
export default async function Profile() {
  const s = await getSession();
  if (!s) redirect("/login?next=/profile");
  const p = await shooterProfile(s.uid);
  if (!p) redirect("/login");
  return <ShooterProfile p={p} />;
}
