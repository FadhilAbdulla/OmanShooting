import { requirePageRole } from "@/lib/auth";
import { pickerData } from "@/lib/picker";
import { Scoring } from "./scoring";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const s = await requirePageRole(["ADMIN", "JUDGE"]);
  const data = await pickerData((await searchParams).group);
  return <Scoring data={data} isAdmin={s.roles.includes("ADMIN")} />;
}
