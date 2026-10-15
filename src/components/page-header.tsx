import Link from "next/link";

/** Consistent header for the information pages, with an honest "sample content" note for the MVP. */
export function PageHeader({ title, intro, ar, sample = true }: { title: string; intro?: string; ar: boolean; sample?: boolean }) {
  return (
    <div className="mb-6 border-b border-sand-200 pb-5">
      <nav className="mb-2 text-xs text-stone-500"><Link href="/" className="hover:underline">{ar ? "الرئيسية" : "Home"}</Link> <span aria-hidden>›</span> {title}</nav>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {intro && <p className="mt-2 max-w-3xl text-stone-600">{intro}</p>}
      {sample && (
        <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900 ring-1 ring-amber-200">
          {ar ? "محتوى تجريبي — ستستبدله اللجنة بالمحتوى الرسمي" : "Sample content — to be replaced with the Committee's official content"}
        </p>
      )}
    </div>
  );
}
