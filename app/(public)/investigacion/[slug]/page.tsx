import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedResearchBySlug } from "@/lib/content/research";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";

type InvestigacionPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function InvestigacionPublicaPage({
  params
}: InvestigacionPublicaPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedResearchBySlug(slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/investigacion/${item.slug}`,
    type: "research",
    tags: item.tags
  });

  return (
    <PublicArticlePage
      kicker="Investigacion publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/investigacion"
      backLabel="Volver a investigacion"
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/investigacion?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
    />
  );
}
