import { notFound } from "next/navigation";
import { ContentType } from "@prisma/client";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedTextContentBySlug } from "@/lib/content/text-content";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";

type ReflexionPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ReflexionPublicaPage({
  params
}: ReflexionPublicaPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedTextContentBySlug(ContentType.REFLECTION, slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/reflexiones/${item.slug}`,
    type: "reflection",
    tags: item.tags
  });

  return (
    <PublicArticlePage
      kicker="Reflexion publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/reflexiones"
      backLabel="Volver a reflexiones"
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
    />
  );
}
