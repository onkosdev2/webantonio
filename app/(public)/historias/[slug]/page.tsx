import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentType } from "@prisma/client";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedTextContentBySlug } from "@/lib/content/text-content";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";
import { articleJsonLd, articleMetadata, breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo";

type HistoriaPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: HistoriaPublicaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedTextContentBySlug(ContentType.STORY, slug);

  if (!item) {
    return {};
  }

  return articleMetadata({
    title: `${item.title} | Historia clínica narrativa`,
    description: item.summary,
    path: `/historias/${item.slug}`,
    keywords: [item.source, ...item.tags, "historia clínica narrativa"].filter(Boolean)
  });
}

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
      editHref={`/panel/historias/${item.slug}`}
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
      jsonLd={[
        physicianJsonLd,
        articleJsonLd({
          path: `/historias/${item.slug}`,
          headline: item.title,
          description: item.summary,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          articleSection: "Historias clínicas narrativas",
          keywords: [item.source, ...item.tags].filter(Boolean)
        }),
        breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Historias", path: "/historias" },
          { name: item.title, path: `/historias/${item.slug}` }
        ])
      ]}
    />
  );
}
