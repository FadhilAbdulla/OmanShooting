import { requirePageRole } from "@/lib/auth";
import { pickerData } from "@/lib/picker";
import { CheckIn } from "./checkin";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await requirePageRole(["ADMIN", "RECEPTION", "JUDGE"]);
  const data = await pickerData((await searchParams).group);
  return <CheckIn data={data} />;
}
