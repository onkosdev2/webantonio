import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentType } from "@prisma/client";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedTextContentBySlug } from "@/lib/content/text-content";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";
import { articleJsonLd, articleMetadata, breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo";

type ReflexionPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: ReflexionPublicaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedTextContentBySlug(ContentType.REFLECTION, slug);

  if (!item) {
    return {};
  }

  return articleMetadata({
    title: `${item.title} | Reflexión médica oncológica`,
    description: item.summary,
    path: `/reflexiones/${item.slug}`,
    keywords: [item.source, ...item.tags, "reflexión médica oncológica"].filter(Boolean)
  });
}

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
      kicker="Reflexión publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/reflexiones"
      backLabel="Volver a reflexiones"
      editHref={`/panel/reflexiones/${item.slug}`}
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
      jsonLd={[
        physicianJsonLd,
        articleJsonLd({
          path: `/reflexiones/${item.slug}`,
          headline: item.title,
          description: item.summary,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          articleSection: "Reflexiones médicas",
          keywords: [item.source, ...item.tags].filter(Boolean)
        }),
        breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Reflexiones", path: "/reflexiones" },
          { name: item.title, path: `/reflexiones/${item.slug}` }
        ])
      ]}
    />
  );
}
