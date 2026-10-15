"use client";
import { useRouter } from "next/navigation";

export function LocaleToggle({ locale }: { locale: string }) {
  const r = useRouter();
  return (
    <button
      className="rounded-md px-2 py-1 text-sm hover:bg-white/10"
      onClick={async () => {
        await fetch("/api/locale", { method: "POST", body: JSON.stringify({ locale: locale === "ar" ? "en" : "ar" }) });
        r.refresh();
      }}
    >
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}

export function LogoutButton({ label, to = "/", className = "rounded-md px-2 py-1 text-sm hover:bg-white/10" }: { label: string; to?: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = to;
      }}
    >
      {label}
    </button>
  );
}
