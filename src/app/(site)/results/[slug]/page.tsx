import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n";
import { Card, LinkButton } from "@/components/ui";
import { Leaderboard } from "@/components/leaderboard";

export const dynamic = "force-dynamic";

export default async function Results({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getDict();
  const ev = await prisma.event.findUnique({ where: { slug }, include: { competitions: { orderBy: { sortOrder: "asc" }, include: { children: { select: { id: true } } } } } });
  if (!ev || ev.status === "DRAFT") notFound();
  const leaves = ev.competitions.filter((c) => !c.children.length);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-sm text-stone-500">Live results</p><h1 className="text-2xl font-bold">{pick(ev, locale)}</h1></div>
        <LinkButton href={`/tv/${ev.slug}`} variant="secondary" size="sm">TV mode ↗</LinkButton>
      </div>
      {leaves.map((c) => (
        <Card key={c.id} className="p-4">
          <h2 className="mb-3 font-semibold">{pick(c, locale)}</h2>
          <Leaderboard competitionId={c.id} />
        </Card>
      ))}
    </div>
  );
}
