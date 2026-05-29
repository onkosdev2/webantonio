import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedEditorialBySlug } from "@/lib/content/editorials";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";

type EditorialPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditorialPublicaPage({
  params
}: EditorialPublicaPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedEditorialBySlug(slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/editoriales/${item.slug}`,
    type: "editorial",
    tags: item.tags
  });

  return (
    <PublicArticlePage
      kicker="Editorial publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/editoriales"
      backLabel="Volver a editoriales"
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/editoriales?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
    />
  );
}
