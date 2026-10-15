import { isDemo } from "@/lib/utils";
import { getLocale } from "@/lib/i18n";

/** Shown whenever demo shortcuts (on-screen OTP, sandbox payments) are active. */
export async function DemoBanner() {
  if (!isDemo()) return null;
  const ar = (await getLocale()) === "ar";
  const setting = (process.env.FIXED_OTP || "123456").trim();
  const code = /^\d{6}$/.test(setting) ? setting : null; // same rule as the sign-in API
  return (
    <div className="bg-amber-400 px-4 py-1 text-center text-[11px] font-medium text-amber-950 no-print md:py-1.5 md:text-xs">
      <span className="md:hidden">{ar ? `بيئة تجريبية${code ? ` · رمز الدخول ${code}` : ""}` : `Demo${code ? ` · sign-in code ${code}` : ""} · sandbox payments`}</span>
      <span className="hidden md:inline">
        {ar
          ? `بيئة تجريبية — ${code ? `رمز الدخول ${code} للجميع` : "تظهر رموز التحقق على الشاشة"} ويُستخدم الدفع التجريبي. لا تُدخل بيانات شخصية حقيقية.`
          : `Demo environment — ${code ? `every sign-in uses code ${code}` : "verification codes are shown on screen"} and card payments use a sandbox. Do not enter real personal data.`}
      </span>
    </div>
  );
}
