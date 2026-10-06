import { isDemo } from "@/lib/utils";
import { getLocale } from "@/lib/i18n";

/** Shown whenever demo shortcuts (on-screen OTP, sandbox payments) are active. */
export async function DemoBanner() {
  if (!isDemo()) return null;
  const ar = (await getLocale()) === "ar";
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950 no-print">
      {ar
        ? "بيئة تجريبية — تظهر رموز التحقق على الشاشة ويُستخدم الدفع التجريبي. لا تُدخل بيانات شخصية حقيقية."
        : "Demo environment — verification codes are shown on screen and card payments use a sandbox. Do not enter real personal data."}
    </div>
  );
}
