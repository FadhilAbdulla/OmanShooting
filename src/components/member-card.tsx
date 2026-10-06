import QRCode from "qrcode";
import { Logo } from "./logo";
import { memberToken } from "@/lib/member";

type U = { fullName: string; memberNo: number; governorate: string | null; hand: string; photo: string | null };

/** MEM-11 digital membership card with a signed QR for check-in and verification. */
export async function MemberCard({ user }: { user: U }) {
  const verifyUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/verify/${memberToken(user.memberNo)}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240, color: { dark: "#4a0611" } });
  return (
    <div className="heritage-bg rounded-2xl p-5 text-sand-50 shadow-lg">
      <div className="flex items-center gap-2"><Logo /><div className="text-sm leading-tight">Oman Traditional Shooting<br /><span className="text-sand-300">الرماية التقليدية العُمانية</span></div></div>
      <div className="mt-4 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          {user.photo && <img src={user.photo} alt="" className="mb-2 h-16 w-16 rounded-full border-2 border-sand-200 object-cover" />}
          <div className="text-lg font-bold leading-tight">{user.fullName}</div>
          <div className="text-sm text-sand-300">Member M{user.memberNo}</div>
          <div className="text-sm text-sand-300">{user.governorate} · {user.hand === "LEFT" ? "Left" : "Right"}-handed</div>
        </div>
        <img src={qr} alt="Membership QR code" className="h-28 w-28 rounded-lg bg-white p-1" />
      </div>
      <div className="mt-3 text-[11px] text-sand-300">Show this QR at the check-in desk</div>
    </div>
  );
}
