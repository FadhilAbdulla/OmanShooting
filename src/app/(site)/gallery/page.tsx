import { getDict } from "@/lib/i18n";
import { GALLERY, VIDEOS } from "@/lib/site-content";
import { PageHeader } from "@/components/page-header";
import { GalleryGrid } from "./grid";

export const metadata = { title: "Gallery · Oman Traditional Shooting" };

/** WEB-05: photo and video gallery. */
export default async function Gallery() {
  const { locale } = await getDict();
  const ar = locale === "ar";
  const L = (x: { en: string; ar: string }) => (ar ? x.ar : x.en);
  return (
    <div>
      <PageHeader ar={ar} title={ar ? "معرض الصور والفيديو" : "Photo & video gallery"} intro={ar ? "لقطات من البطولات والموروث العُماني." : "Moments from our championships and Omani heritage."} />
      <h2 className="mb-3 text-lg font-semibold">{ar ? "الصور" : "Photos"}</h2>
      <GalleryGrid items={GALLERY.map((g) => ({ src: g.src, caption: L(g.caption) }))} />
      <h2 className="mb-3 mt-10 text-lg font-semibold">{ar ? "الفيديو" : "Videos"}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((v) => (
          <figure key={v.title.en} className="overflow-hidden rounded-xl border border-sand-200 bg-white">
            <div className="relative aspect-video bg-stone-900">
              <img src={v.poster} alt="" className="h-full w-full object-cover opacity-70" />
              <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-2xl text-brand-600 shadow-lg">▶</span></span>
              <span className="absolute bottom-2 end-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">{v.duration}</span>
            </div>
            <figcaption className="p-3 text-sm font-medium">{L(v.title)}<span className="block text-xs font-normal text-stone-500">{ar ? "سيُنشر قريباً" : "Coming soon"}</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
