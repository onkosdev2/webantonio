import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedEditorialBySlug } from "@/lib/content/editorials";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";
import { articleJsonLd, articleMetadata, breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo";

type EditorialPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: EditorialPublicaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedEditorialBySlug(slug);

  if (!item) {
    return {};
  }

  return articleMetadata({
    title: `${item.title} | Editorial oncológica`,
    description: item.summary,
    path: `/editoriales/${item.slug}`,
    keywords: [item.source, ...item.tags, "editorial oncológica"].filter(Boolean)
  });
}

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
      editHref={`/panel/editoriales/${item.slug}`}
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/editoriales?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
      jsonLd={[
        physicianJsonLd,
        articleJsonLd({
          path: `/editoriales/${item.slug}`,
          headline: item.title,
          description: item.summary,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          articleSection: "Editoriales oncológicas",
          keywords: [item.source, ...item.tags].filter(Boolean)
        }),
        breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Editoriales", path: "/editoriales" },
          { name: item.title, path: `/editoriales/${item.slug}` }
        ])
      ]}
    />
  );
}
