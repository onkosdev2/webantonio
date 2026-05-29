import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedNewsItemBySlug } from "@/lib/content/news";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";

type NoticiaPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NoticiaPublicaPage({
  params
}: NoticiaPublicaPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedNewsItemBySlug(slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/noticias/${item.slug}`,
    type: "news_item",
    tumorType: item.tumorType,
    biomarkers: item.biomarkers,
    tags: item.tags
  });

  return (
    <PublicArticlePage
      kicker="Noticia publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/noticias"
      backLabel="Volver a noticias"
      meta={[
        item.source ? `Fuente: ${item.source}` : "",
        item.tumorType
          ? {
              label: `Tumor: ${item.tumorType}`,
              href: `/noticias?tumor=${encodeURIComponent(item.tumorType)}`
            }
          : "",
        item.biomarkers.length > 0
          ? {
              label: `Biomarcadores: ${item.biomarkers.join(", ")}`,
              href: `/noticias?biomarker=${encodeURIComponent(item.biomarkers[0])}`
            }
          : ""
      ].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
    />
  );
}
