import { prisma } from "@/lib/db";
import { requirePageRole, STAFF } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ChangePassword } from "./change-password";

export const dynamic = "force-dynamic";

export default async function Account() {
  const s = await requirePageRole(STAFF, "/admin/account");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.uid } });
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">My account</h1>
      <Card className="p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-stone-500">Name</dt><dd className="font-medium">{user.fullName}</dd>
          <dt className="text-stone-500">Sign-in</dt><dd className="font-mono">{user.username ?? "—"}</dd>
        </dl>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Change password</h2>
        <ChangePassword />
      </Card>
    </div>
  );
}
