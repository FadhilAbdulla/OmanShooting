/**
 * Sample content for the public information pages (WEB-01 … WEB-06).
 * Facts taken from the RFP (responsibilities, named contacts, phone numbers, email) are real;
 * everything else is placeholder copy for the MVP and should be replaced by the Committee
 * (the CMS in WEB-07 is the long-term home for this content).
 */
type T = { en: string; ar: string };
const t = (en: string, ar: string): T => ({ en, ar });

export const COMMITTEE = {
  intro: t(
    "The Oman Committee for Traditional Shooting with Traditional Weapons is the official body responsible for organising, developing and supervising traditional shooting in the Sultanate of Oman, and for preserving this authentic national heritage.",
    "اللجنة العُمانية للرماية بالأسلحة التقليدية هي الجهة الرسمية المسؤولة عن تنظيم الرماية التقليدية وتطويرها والإشراف عليها في سلطنة عُمان، وعن صون هذا الموروث الوطني الأصيل.",
  ),
  vision: t("A thriving national tradition of marksmanship, practised safely and passed proudly to future generations.", "موروث وطني مزدهر في الرماية، يُمارَس بأمان ويُنقَل بفخر إلى الأجيال القادمة."),
  mission: t(
    "To organise fair, well-run championships, license ranges and participants, and document Omani traditional shooting through modern digital services.",
    "تنظيم بطولات عادلة ومحكمة، وترخيص الميادين والمشاركين، وتوثيق الرماية التقليدية العُمانية عبر خدمات رقمية حديثة.",
  ),
  responsibilities: [
    t("Organising national championships and events", "تنظيم البطولات والفعاليات الوطنية"),
    t("Approving and licensing shooting ranges", "اعتماد ميادين الرماية وترخيصها"),
    t("Issuing licences to shooters and event organisers", "إصدار التراخيص للرماة ومنظمي الفعاليات"),
    t("Developing rules, systems and regulations", "تطوير القواعد والأنظمة واللوائح"),
    t("Appointing and accrediting judges", "تعيين الحكام واعتمادهم"),
    t("Preserving and documenting the heritage of traditional shooting", "صون موروث الرماية التقليدية وتوثيقه"),
  ],
  // Structure is a sample until the Committee provides its official chart
  structure: [
    { unit: t("Committee Chair", "رئاسة اللجنة"), children: [] as T[] },
    {
      unit: t("Committee Members", "أعضاء اللجنة"),
      children: [
        t("Technical & Championships", "الشؤون الفنية والبطولات"),
        t("Administrative & Financial Affairs", "الشؤون الإدارية والمالية"),
        t("Ranges & Licensing", "الميادين والتراخيص"),
        t("Judges & Referees", "الحكام"),
        t("Media & Heritage", "الإعلام والموروث"),
      ],
    },
  ],
  members: [
    { name: t("Khalfan bin Mohammed bin Saeed Al-Sharji", "خلفان بن محمد بن سعيد الشرجي"), role: t("Head of Administrative and Financial Affairs", "رئيس الشؤون الإدارية والمالية"), real: true },
    { name: t("Jassim bin Mohammed Al-Musafari", "جاسم بن محمد المسافري"), role: t("Committee Member", "عضو اللجنة"), real: true },
    { name: t("To be announced", "يُعلن لاحقاً"), role: t("Committee Chair", "رئيس اللجنة"), real: false },
    { name: t("To be announced", "يُعلن لاحقاً"), role: t("Technical & Championships", "الشؤون الفنية والبطولات"), real: false },
  ],
};

export type Doc = { id: string; category: T; title: T; summary: T; updated: string };

export const REGULATION_GROUPS: { key: string; title: T; docs: Doc[] }[] = [
  {
    key: "regulations", title: t("Regulatory regulations", "اللوائح التنظيمية"),
    docs: [
      { id: "r1", category: t("Regulation", "لائحة"), title: t("General regulation for traditional shooting", "اللائحة العامة للرماية التقليدية"), summary: t("Scope, definitions, the Committee's powers and the general obligations of shooters, ranges and organisers.", "النطاق والتعريفات وصلاحيات اللجنة والالتزامات العامة للرماة والميادين والمنظمين."), updated: "2026-01-15" },
      { id: "r2", category: t("Regulation", "لائحة"), title: t("Range safety regulation", "لائحة السلامة في الميادين"), summary: t("Firing-line discipline, weapon handling, spectator areas and the range officer's authority.", "انضباط خط الرماية والتعامل مع السلاح ومناطق الجمهور وصلاحيات مسؤول الميدان."), updated: "2026-01-15" },
    ],
  },
  {
    key: "membership", title: t("Membership & registration terms", "شروط العضوية والتسجيل"),
    docs: [
      { id: "m1", category: t("Terms", "شروط"), title: t("Membership terms", "شروط العضوية"), summary: t("Eligibility, required documents (civil ID), member responsibilities and how membership can be suspended.", "الأهلية والوثائق المطلوبة (البطاقة المدنية) ومسؤوليات العضو وحالات إيقاف العضوية."), updated: "2026-02-01" },
      { id: "m2", category: t("Terms", "شروط"), title: t("Booking, payment & cancellation policy", "سياسة الحجز والدفع والإلغاء"), summary: t("Targets are held for 10 minutes to pay. Bookings can be changed or cancelled up to 48 hours before the group starts, within the per-event limit.", "يُحجز الهدف لمدة 10 دقائق لإتمام الدفع. يمكن تعديل الحجز أو إلغاؤه حتى 48 ساعة قبل بدء المجموعة وضمن الحد المسموح لكل فعالية."), updated: "2026-02-01" },
    ],
  },
  {
    key: "championships", title: t("Championship rules", "قواعد البطولات"),
    docs: [
      { id: "c1", category: t("Rules", "قواعد"), title: t("Competition rules & scoring", "قواعد المسابقات واحتساب النقاط"), summary: t("Categories, series and shots, scoring, inner-ten tie-breaks, finals and the publication of official results.", "الفئات والسلاسل والطلقات واحتساب النقاط وكسر التعادل والنهائيات واعتماد النتائج الرسمية."), updated: "2026-03-10" },
      { id: "c2", category: t("Rules", "قواعد"), title: t("Judges' code of conduct", "ميثاق سلوك الحكام"), summary: t("Impartiality, score verification and the appeals procedure.", "الحياد والتحقق من النتائج وإجراءات التظلم."), updated: "2026-03-10" },
    ],
  },
  {
    key: "licensing", title: t("Licensing terms", "شروط الترخيص"),
    docs: [
      { id: "l1", category: t("Terms", "شروط"), title: t("Range licensing terms", "شروط ترخيص الميادين"), summary: t("Site plan, safety distances, facilities and inspection before approval.", "المخطط والمسافات الآمنة والمرافق والتفتيش قبل الاعتماد."), updated: "2026-04-05" },
      { id: "l2", category: t("Terms", "شروط"), title: t("Event licensing terms", "شروط ترخيص الفعاليات"), summary: t("How to apply to organise a championship: programme, location and judges.", "كيفية التقدم لتنظيم بطولة: البرنامج والموقع والحكام."), updated: "2026-04-05" },
    ],
  },
  {
    key: "guides", title: t("Guides & procedures", "الأدلة والإجراءات"),
    docs: [
      { id: "g1", category: t("Guide", "دليل"), title: t("Shooter's guide to the platform", "دليل الرامي لاستخدام المنصة"), summary: t("Signing in with your civil ID, booking a target, paying and checking in on competition day.", "الدخول بالرقم المدني وحجز الهدف والدفع وتسجيل الحضور يوم البطولة."), updated: "2026-10-01" },
    ],
  },
];

export const CIRCULARS: { no: string; date: string; title: T; summary: T; important?: boolean }[] = [
  { no: "C-2026/014", date: "2026-10-10", important: true, title: t("Registration open: Ministry Championship 2026", "فتح التسجيل: بطولة الوزارة ٢٠٢٦"), summary: t("Registration for all categories is open on the platform. Targets are allocated first come, first served.", "التسجيل لجميع الفئات متاح عبر المنصة، ويُخصَّص الهدف حسب أسبقية الحجز.") },
  { no: "C-2026/013", date: "2026-09-28", title: t("Mandatory civil-ID check at the firing line", "التحقق الإلزامي من البطاقة المدنية على خط الرماية"), summary: t("Shooters must show their membership QR code or civil ID at check-in.", "على الرماة إبراز رمز العضوية أو البطاقة المدنية عند تسجيل الحضور.") },
  { no: "C-2026/012", date: "2026-09-12", title: t("Updated cancellation policy", "تحديث سياسة الإلغاء"), summary: t("Cancellations and changes close 48 hours before the group starts.", "يُغلق الإلغاء والتعديل قبل 48 ساعة من بدء المجموعة.") },
  { no: "C-2026/011", date: "2026-08-30", title: t("Call for judges — season 2026/27", "دعوة لاعتماد الحكام — موسم ٢٠٢٦/٢٠٢٧"), summary: t("Experienced shooters are invited to apply for judge accreditation.", "يُدعى الرماة ذوو الخبرة للتقدم لاعتماد الحكام.") },
];

export type NewsKind = "news" | "announcement" | "media" | "press";
export const NEWS_KINDS: Record<NewsKind, T> = {
  news: t("News", "أخبار"), announcement: t("Announcements", "إعلانات"), media: t("Media coverage", "التغطية الإعلامية"), press: t("Press releases", "بيانات صحفية"),
};
export const NEWS: { slug: string; kind: NewsKind; date: string; image: string; title: T; summary: T }[] = [
  { slug: "ministry-championship-opens", kind: "news", date: "2026-10-08", image: "/images/hero-shooter.jpg", title: t("Ministry Championship 2026 gets under way in Muscat", "انطلاق بطولة الوزارة ٢٠٢٦ في مسقط"), summary: t("Shooters from across the governorates take to the firing line for the flagship national championship.", "رماة من مختلف المحافظات على خط الرماية في البطولة الوطنية الرئيسية.") },
  { slug: "digital-platform-launch", kind: "press", date: "2026-10-01", image: "/images/heritage-nizwa.jpg", title: t("Committee launches national digital platform", "اللجنة تطلق المنصة الرقمية الوطنية"), summary: t("Membership, target booking, payments and live results now in one place.", "العضوية وحجز الأهداف والدفع والنتائج المباشرة في مكان واحد.") },
  { slug: "results-published", kind: "announcement", date: "2026-09-20", image: "/images/nizwa-tower.jpg", title: t("Official results now published online", "نشر النتائج الرسمية عبر المنصة"), summary: t("Final rankings are locked and available to view and print.", "الترتيب النهائي معتمد ومتاح للعرض والطباعة.") },
  { slug: "heritage-feature", kind: "media", date: "2026-09-05", image: "/images/nizwa-cannon.jpg", title: t("Feature: keeping the Saktoun tradition alive", "تقرير: الحفاظ على تقليد الصكتون"), summary: t("A look at how a new generation is learning traditional marksmanship.", "نظرة على تعلّم جيل جديد للرماية التقليدية.") },
];

export const GALLERY: { src: string; caption: T }[] = [
  { src: "/images/hero-shooter.jpg", caption: t("On the firing line", "على خط الرماية") },
  { src: "/images/hero-fort.jpg", caption: t("Heritage forts of Oman", "قلاع عُمان التراثية") },
  { src: "/images/heritage-nizwa.jpg", caption: t("Nizwa Fort", "قلعة نزوى") },
  { src: "/images/nizwa-cannon.jpg", caption: t("Historic cannon, Nizwa", "مدفع تاريخي، نزوى") },
  { src: "/images/fort-archway.jpg", caption: t("Through the archway", "من خلال القوس") },
  { src: "/images/adobe-wall.jpg", caption: t("Traditional architecture", "العمارة التقليدية") },
  { src: "/images/nizwa-tower.jpg", caption: t("Nizwa Fort tower", "برج قلعة نزوى") },
];

export const VIDEOS: { poster: string; title: T; duration: string }[] = [
  { poster: "/images/hero-shooter.jpg", title: t("Ministry Championship 2026 — highlights", "بطولة الوزارة ٢٠٢٦ — أبرز اللقطات"), duration: "3:12" },
  { poster: "/images/heritage-nizwa.jpg", title: t("How to book a target on the platform", "كيف تحجز هدفاً عبر المنصة"), duration: "1:45" },
  { poster: "/images/nizwa-cannon.jpg", title: t("The heritage of traditional weapons", "موروث الأسلحة التقليدية"), duration: "5:30" },
];

export const CONTACT = {
  phone: "+968 9266 1818",
  email: "omanshooter@mcsy.gov.om",
  people: [
    { name: t("Jassim bin Mohammed Al-Musafari", "جاسم بن محمد المسافري"), role: t("Committee Member", "عضو اللجنة"), phone: "+968 9944 4419" },
    { name: t("Khalfan bin Mohammed Al-Sharji", "خلفان بن محمد الشرجي"), role: t("Head of Administrative and Financial Affairs", "رئيس الشؤون الإدارية والمالية"), phone: "+968 9920 0339" },
  ],
  hours: t("Sunday – Thursday, 7:30 am – 2:30 pm", "الأحد – الخميس، 7:30 صباحاً – 2:30 ظهراً"),
  locations: [
    { name: t("Committee office (sample location)", "مكتب اللجنة (موقع تجريبي)"), address: t("Ministry of Culture, Sports and Youth, Muscat", "وزارة الثقافة والرياضة والشباب، مسقط"), map: "Ministry of Culture, Sports and Youth, Muscat, Oman" },
    { name: t("Al Amerat Shooting Range (sample)", "ميدان العامرات للرماية (تجريبي)"), address: t("Al Amerat, Muscat Governorate", "العامرات، محافظة مسقط"), map: "Al Amerat, Muscat, Oman" },
  ],
};

export const INFO_PAGES = [
  { href: "/about", label: t("Committee profile", "عن اللجنة") },
  { href: "/regulations", label: t("Regulations & laws", "اللوائح والأنظمة") },
  { href: "/circulars", label: t("Circulars", "التعاميم") },
  { href: "/news", label: t("News & media", "الأخبار والإعلام") },
  { href: "/gallery", label: t("Gallery", "معرض الصور") },
  { href: "/contact", label: t("Contact us", "اتصل بنا") },
];
