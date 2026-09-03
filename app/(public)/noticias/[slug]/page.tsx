import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublicationGallery } from "@/lib/content/publication-gallery";
import { getPublishedNewsItemBySlug } from "@/lib/content/news";
import { formatPublicPublicationDate } from "@/lib/content/public-dates";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";
import { articleJsonLd, articleMetadata, breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo";

type NoticiaPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: NoticiaPublicaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedNewsItemBySlug(slug);

  if (!item) {
    return {};
  }

  return articleMetadata({
    title: `${item.title} | Noticia oncológica`,
    description: item.summary,
    path: `/noticias/${item.slug}`,
    image: item.featuredImage?.src,
    datePublished: item.publishedAt,
    dateModified: item.updatedAt,
    keywords: [
      item.source,
      item.tumorType,
      ...item.biomarkers,
      ...item.tags,
      "noticias oncológicas"
    ].filter(Boolean)
  });
}

export default async function NoticiaPublicaPage({
  params
}: NoticiaPublicaPageProps) {
  const { slug } = await params;
  const item = await getPublishedNewsItemBySlug(slug);

  if (!item) {
    notFound();
  }

  if (slug !== item.slug) {
    permanentRedirect(`/noticias/${item.slug}`);
  }

  const archiveItems = await getPublicArchiveItems();

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/noticias/${item.slug}`,
    type: "news_item",
    tumorType: item.tumorType,
    biomarkers: item.biomarkers,
    tags: item.tags
  });
  const publicationDate = formatPublicPublicationDate(item.publishedAt, item.updatedAt);

  return (
    <PublicArticlePage
      variant="news"
      kicker="Noticia publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      publicationDate={publicationDate}
      featuredImage={item.featuredImage}
      gallery={await getPublicationGallery(item.id)}
      backHref="/noticias"
      backLabel="Volver a noticias"
      editHref={`/panel/noticias/${item.slug}`}
      meta={[
        item.source
          ? {
              label: `Fuente: ${item.source}`,
              href: item.sourceUrl || undefined
            }
          : "",
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
      jsonLd={[
        physicianJsonLd,
        articleJsonLd({
          path: `/noticias/${item.slug}`,
          headline: item.title,
          description: item.summary,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          articleSection: "Noticias oncológicas",
          image: item.featuredImage?.src,
          type: "NewsArticle",
          keywords: [item.source, item.tumorType, ...item.biomarkers, ...item.tags].filter(Boolean)
        }),
        breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Noticias", path: "/noticias" },
          { name: item.title, path: `/noticias/${item.slug}` }
        ])
      ]}
    />
  );
}
