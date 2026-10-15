import type { Badge } from "@/lib/events";

export type HomeCopy = {
  heroAlt: string; shooterAlt: string; eyebrow: string; heroTitle: string; heroSub: string; ctaBrowse: string; ctaJoin: string; trust: string[];
  nextUp: string; dates: string; location: string; competitions: string; placesLeft: string; chooseTarget: string; badge: Record<Badge, string>;
  stats: { members: string; championships: string; entries: string; governorates: string };
  champKicker: string; champTitle: string; champSub: string; noEvents: string; bookNow: string; viewDetails: string;
  howKicker: string; howTitle: string; howSub: string; steps: { t: string; d: string }[]; archAlt: string; floatTitle: string; floatSub: string;
  liveKicker: string; liveTitle: string; liveSub: string; fullResults: string; tvMode: string;
  heritageKicker: string; heritageTitle: string; heritageBody: string[]; weapons: { t: string; d: string }[]; nizwaAlt: string; cannonAlt: string; adobeAlt: string;
  orgKicker: string; orgTitle: string; orgSub: string; features: { i: string; t: string; d: string }[];
  ctaTitle: string; ctaSub: string;
};

export const HOME: Record<"en" | "ar", HomeCopy> = {
  en: {
    heroAlt: "Historic Omani fort with the national flag",
    shooterAlt: "Marksman taking aim at sunset",
    eyebrow: "Official platform of the Oman Committee for Traditional Shooting",
    heroTitle: "Where Omani marksmanship heritage meets the future",
    heroSub: "Register with your civil ID, choose your exact target on a live board, pay securely and follow every score as it happens — across every championship in the Sultanate.",
    ctaBrowse: "Browse Championships", ctaJoin: "Become a member",
    trust: ["Civil-ID sign-in, no passwords", "Secure online payment", "Live results & rankings"],
    nextUp: "Next championship", dates: "Starts", location: "Location", competitions: "competitions", placesLeft: "places left", chooseTarget: "Choose your target",
    badge: { DRAFT: "Draft", COMING_SOON: "Coming soon", OPEN: "Registration open", CLOSED: "Closed" },
    stats: { members: "Registered shooters", championships: "Championships", entries: "Confirmed entries", governorates: "Governorates represented" },
    champKicker: "Championships", champTitle: "Take your place on the firing line",
    champSub: "Every group and every target is shown live. Pick yours, hold it for ten minutes and confirm with one payment.",
    noEvents: "No championships are open right now — check back soon.", bookNow: "Book a target", viewDetails: "View details",
    howKicker: "How it works", howTitle: "From registration to the podium in four steps",
    howSub: "Designed so a shooter can book in under two minutes from a phone — and organisers spend their time on the range, not on paperwork.",
    steps: [
      { t: "Sign in with your civil ID", d: "A one-time code is sent by SMS. Your membership card with QR code is issued instantly." },
      { t: "Pick a championship and target", d: "Filter by category, see which targets are free in real time, and hold the one you want." },
      { t: "Pay your way", d: "Card via Thawani, bank transfer with receipt upload, or cash at reception." },
      { t: "Check in and compete", d: "Scan your QR at the range, shoot, and watch your score climb the live leaderboard." },
    ],
    archAlt: "View of an Omani fort through a traditional archway",
    floatTitle: "Target 7 · Group G2 confirmed", floatSub: "Participant #24 — see you on the line",
    liveKicker: "Live now", liveTitle: "Every shot, every ranking — live",
    liveSub: "Judges enter scores on the range and the leaderboard updates instantly for spectators, shooters and the big screen at the venue.",
    fullResults: "Full results", tvMode: "Open TV mode",
    heritageKicker: "Our heritage", heritageTitle: "A tradition carried from the forts to the firing line",
    heritageBody: [
      "Traditional shooting with traditional weapons is part of Oman's living heritage — a test of skill, steadiness and respect passed between generations.",
      "The Committee organises championships across the governorates, approves ranges and licenses participants, and this platform brings all of it together in one national record of shooters, events and achievements.",
    ],
    weapons: [
      { t: "Saktoun", d: "The long traditional rifle, historically carried for hunting." },
      { t: "Abu Fatila", d: "The matchlock rifle — a symbol of Omani craftsmanship." },
    ],
    nizwaAlt: "Courtyard of the round tower at Nizwa Fort", cannonAlt: "Historic cannon at the entrance of Nizwa Fort", adobeAlt: "Traditional adobe architecture",
    orgKicker: "For the Committee", orgTitle: "Everything organisers need on championship day",
    orgSub: "One console for setting up events, running the range and publishing official results.",
    features: [
      { i: "setup", t: "Set up in minutes", d: "Presets for 7- and 10-shot and team competitions, automatic age and gender categories, and batch scheduling of every group." },
      { i: "live", t: "Real-time target booking", d: "Built for hundreds of shooters booking at the same moment — no double bookings, ever." },
      { i: "checkin", t: "Fast check-in", d: "Scan member QR codes, collect cash, replace no-shows and register walk-ins from one screen." },
      { i: "scoring", t: "Live scoring", d: "Keyboard-fast score entry, automatic finals, tie-breaks and locked official results." },
      { i: "payments", t: "Payments & reconciliation", d: "Online, transfer and cash in one ledger, with a daily reconciliation view." },
      { i: "secure", t: "Secure by design", d: "Role-based access, a full audit trail and data hosted in line with Omani data-protection law." },
    ],
    ctaTitle: "Ready to take your place on the line?",
    ctaSub: "Create your membership in a minute with your civil ID and be first to book when registration opens.",
  },
  ar: {
    heroAlt: "قلعة عُمانية تاريخية يرفرف فوقها العلم الوطني",
    shooterAlt: "رامٍ يصوّب عند الغروب",
    eyebrow: "المنصة الرسمية للجنة العُمانية للرماية التقليدية",
    heroTitle: "حيث يلتقي موروث الرماية العُمانية بالمستقبل",
    heroSub: "سجّل ببطاقتك المدنية، واختر هدفك بدقة من لوحة مباشرة، وادفع بأمان، وتابع كل نتيجة لحظة بلحظة — في جميع بطولات السلطنة.",
    ctaBrowse: "تصفح البطولات", ctaJoin: "سجّل عضويتك",
    trust: ["دخول بالرقم المدني دون كلمة مرور", "دفع إلكتروني آمن", "نتائج وترتيب مباشر"],
    nextUp: "البطولة القادمة", dates: "تبدأ", location: "الموقع", competitions: "مسابقات", placesLeft: "مقاعد متبقية", chooseTarget: "اختر هدفك",
    badge: { DRAFT: "مسودة", COMING_SOON: "قريباً", OPEN: "التسجيل مفتوح", CLOSED: "مغلقة" },
    stats: { members: "رامٍ مسجّل", championships: "بطولة", entries: "مشاركة مؤكدة", governorates: "محافظة ممثَّلة" },
    champKicker: "البطولات", champTitle: "خذ مكانك على خط الرماية",
    champSub: "كل مجموعة وكل هدف يظهر مباشرة. اختر هدفك، واحجزه لعشر دقائق، وأكّد بدفعة واحدة.",
    noEvents: "لا توجد بطولات مفتوحة حالياً — تابعنا قريباً.", bookNow: "احجز هدفاً", viewDetails: "التفاصيل",
    howKicker: "كيف تعمل المنصة", howTitle: "من التسجيل إلى منصة التتويج في أربع خطوات",
    howSub: "صُممت ليحجز الرامي في أقل من دقيقتين من هاتفه — وليتفرغ المنظمون للميدان بدلاً من الأوراق.",
    steps: [
      { t: "ادخل برقمك المدني", d: "يصلك رمز تحقق برسالة نصية، وتصدر بطاقة عضويتك مع رمز QR فوراً." },
      { t: "اختر البطولة والهدف", d: "صفِّ حسب الفئة، وشاهد الأهداف المتاحة لحظياً، واحجز ما تريد." },
      { t: "ادفع بالطريقة التي تناسبك", d: "بطاقة عبر ثواني، أو تحويل بنكي مع رفع الإيصال، أو نقداً عند الاستقبال." },
      { t: "سجّل حضورك وشارك", d: "امسح رمزك في الميدان، وارمِ، وتابع صعود نتيجتك في الترتيب المباشر." },
    ],
    archAlt: "قلعة عُمانية من خلال قوس تقليدي",
    floatTitle: "الهدف ٧ · المجموعة G2 مؤكد", floatSub: "المشارك رقم ٢٤ — نراك على الخط",
    liveKicker: "مباشر الآن", liveTitle: "كل طلقة وكل ترتيب — مباشرة",
    liveSub: "يُدخل الحكام النتائج في الميدان فيتحدّث الترتيب فوراً للجمهور والرماة والشاشة الكبيرة في الموقع.",
    fullResults: "النتائج الكاملة", tvMode: "وضع الشاشة",
    heritageKicker: "موروثنا", heritageTitle: "تقليد انتقل من القلاع إلى خط الرماية",
    heritageBody: [
      "الرماية التقليدية بالأسلحة التقليدية جزء حيّ من الموروث العُماني — اختبار للمهارة والثبات والاحترام تتوارثه الأجيال.",
      "تنظم اللجنة البطولات في مختلف المحافظات، وتعتمد الميادين وترخّص المشاركين، وتجمع هذه المنصة ذلك كله في سجل وطني واحد للرماة والفعاليات والإنجازات.",
    ],
    weapons: [
      { t: "الصكتون", d: "البندقية التقليدية الطويلة التي حُملت قديماً للصيد." },
      { t: "أبو فتيلة", d: "بندقية الفتيل — رمز للصناعة العُمانية الأصيلة." },
    ],
    nizwaAlt: "فناء البرج الدائري في قلعة نزوى", cannonAlt: "مدفع تاريخي عند مدخل قلعة نزوى", adobeAlt: "عمارة طينية تقليدية",
    orgKicker: "للجنة", orgTitle: "كل ما يحتاجه المنظمون في يوم البطولة",
    orgSub: "لوحة واحدة لإعداد الفعاليات وإدارة الميدان ونشر النتائج الرسمية.",
    features: [
      { i: "setup", t: "إعداد خلال دقائق", d: "قوالب لمسابقات ٧ و١٠ طلقات والفرق، وفئات عمرية ونوع تلقائياً، وجدولة جماعية لكل المجموعات." },
      { i: "live", t: "حجز لحظي للأهداف", d: "مصمم لمئات الرماة يحجزون في اللحظة نفسها — دون أي حجز مزدوج." },
      { i: "checkin", t: "تسجيل حضور سريع", d: "امسح رموز الأعضاء، واستلم النقد، واستبدل الغائبين، وسجّل الحضور المباشر من شاشة واحدة." },
      { i: "scoring", t: "تسجيل نتائج مباشر", d: "إدخال سريع بلوحة المفاتيح، ونهائيات تلقائية، وكسر التعادل، ونتائج رسمية مقفلة." },
      { i: "payments", t: "المدفوعات والتسوية", d: "الدفع الإلكتروني والتحويل والنقد في سجل واحد مع تسوية يومية." },
      { i: "secure", t: "أمان منذ التصميم", d: "صلاحيات حسب الدور، وسجل تدقيق كامل، واستضافة متوافقة مع قانون حماية البيانات العُماني." },
    ],
    ctaTitle: "هل أنت مستعد لأخذ مكانك على الخط؟",
    ctaSub: "أنشئ عضويتك في دقيقة برقمك المدني وكن أول من يحجز عند فتح التسجيل.",
  },
};
