import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TvRotator } from "./rotator";

export const dynamic = "force-dynamic";

export default async function Tv({ params }: { params: Promise<{ slug: string }> }) {
  const ev = await prisma.event.findUnique({ where: { slug: (await params).slug }, include: { competitions: { orderBy: { sortOrder: "asc" }, include: { children: { select: { id: true } } } } } });
  if (!ev) notFound();
  const comps = ev.competitions.filter((c) => !c.children.length).map((c) => ({ id: c.id, name: c.nameEn, nameAr: c.nameAr }));
  return <TvRotator event={{ nameEn: ev.nameEn, nameAr: ev.nameAr }} comps={comps} />;
}
