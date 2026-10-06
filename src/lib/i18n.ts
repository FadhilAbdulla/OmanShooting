import { cookies } from "next/headers";

export type Locale = "en" | "ar";

const dict = {
  en: {
    brand: "Oman Traditional Shooting", events: "Championships", results: "Results", login: "Sign in", logout: "Sign out",
    my: "My bookings", admin: "Admin", book: "Book a target", cart: "Cart", checkout: "Checkout", upcoming: "Upcoming championships",
    heroTitle: "Preserving the heritage of Omani traditional shooting",
    heroSub: "Register, choose your target, pay online and follow live results — all in one national platform.",
    free: "Available", held: "Held", booked: "Booked", left: "Left-hand", mine: "Your selection",
    remaining: "places left", noEvents: "No championships open right now.",
  },
  ar: {
    brand: "الرماية التقليدية العُمانية", events: "البطولات", results: "النتائج", login: "تسجيل الدخول", logout: "تسجيل الخروج",
    my: "حجوزاتي", admin: "الإدارة", book: "احجز هدفاً", cart: "السلة", checkout: "الدفع", upcoming: "البطولات القادمة",
    heroTitle: "صون موروث الرماية التقليدية العُمانية",
    heroSub: "سجّل، اختر هدفك، ادفع إلكترونياً وتابع النتائج المباشرة — في منصة وطنية واحدة.",
    free: "متاح", held: "محجوز مؤقتاً", booked: "محجوز", left: "أعسر", mine: "اختيارك",
    remaining: "مقاعد متبقية", noEvents: "لا توجد بطولات مفتوحة حالياً.",
  },
} as const;

export type Dict = (typeof dict)["en"];

export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("locale")?.value === "ar" ? "ar" : "en";
}

export async function getDict() {
  const l = await getLocale();
  return { locale: l, t: dict[l] as Dict, dir: l === "ar" ? "rtl" : "ltr" };
}

export function pick<T extends { nameEn: string; nameAr: string }>(o: T, l: Locale) {
  return l === "ar" ? o.nameAr || o.nameEn : o.nameEn;
}
