import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { parseMemberToken } from "@/lib/member";

export const dynamic = "force-dynamic";

/** Public membership verification target of the QR code (MEM-11). Shows only non-sensitive data. */
export default async function Verify({ params }: { params: Promise<{ code: string }> }) {
  const memberNo = parseMemberToken(decodeURIComponent((await params).code));
  const user = memberNo ? await prisma.user.findUnique({ where: { memberNo } }) : null;
  return (
    <div className="mx-auto max-w-sm py-8">
      <Card className="p-6 text-center">
        {user ? (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
            {user.photo && <img src={user.photo} alt="" className="mx-auto mb-3 h-24 w-24 rounded-full object-cover" />}
            <h1 className="text-xl font-bold">{user.fullName}</h1>
            <p className="text-stone-600">Valid member · M{user.memberNo}</p>
            <p className="text-sm text-stone-500">{user.governorate}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl text-rose-700">✕</div>
            <h1 className="text-xl font-bold">Membership not found</h1>
          </>
        )}
      </Card>
    </div>
  );
}
