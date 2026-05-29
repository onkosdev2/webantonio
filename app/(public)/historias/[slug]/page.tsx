import { notFound } from "next/navigation";
import { ContentType } from "@prisma/client";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedTextContentBySlug } from "@/lib/content/text-content";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";

type HistoriaPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HistoriaPublicaPage({
  params
}: HistoriaPublicaPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedTextContentBySlug(ContentType.STORY, slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/historias/${item.slug}`,
    type: "story",
    tags: item.tags
  });

  return (
    <PublicArticlePage
      kicker="Historia publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/historias"
      backLabel="Volver a historias"
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
    />
  );
}
