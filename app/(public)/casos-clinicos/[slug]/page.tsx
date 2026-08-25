import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedClinicalCaseBySlug } from "@/lib/content/cases";
import { formatPublicPublicationDate } from "@/lib/content/public-dates";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";
import { articleJsonLd, articleMetadata, breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo";

type CasoClinicoPublicoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: CasoClinicoPublicoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedClinicalCaseBySlug(slug);

  if (!item) {
    return {};
  }

  return articleMetadata({
    title: `${item.title} | Caso clínico oncológico`,
    description: item.summary,
    path: `/casos-clinicos/${item.slug}`,
    keywords: [
      item.tumorType,
      item.stage,
      ...item.biomarkers,
      ...item.tags,
      "caso clínico oncológico"
    ].filter(Boolean)
  });
}

export default async function CasoClinicoPublicoPage({
  params
}: CasoClinicoPublicoPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedClinicalCaseBySlug(slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/casos-clinicos/${item.slug}`,
    type: "clinical_case",
    tumorType: item.tumorType,
    biomarkers: item.biomarkers,
    tags: item.tags
  });
  const publicationDate = formatPublicPublicationDate(item.publishedAt, item.updatedAt);

  return (
    <PublicArticlePage
      variant="clinical-case"
      kicker="Caso clínico publicado"
      title={item.title}
      summary={item.summary}
      body={item.body}
      publicationDate={publicationDate}
      featuredImage={item.featuredImage}
      backHref="/casos-clinicos"
      backLabel="Volver a casos"
      editHref={`/panel/casos/${item.slug}`}
      meta={[
        item.tumorType
          ? {
              label: `Tumor: ${item.tumorType}`,
              href: `/casos-clinicos?tumor=${encodeURIComponent(item.tumorType)}`
            }
          : "",
        item.stage ? `Estadio: ${item.stage}` : "",
        item.treatmentLine ? `Línea: ${item.treatmentLine}` : "",
        item.response ? `Respuesta: ${item.response}` : ""
      ].filter(Boolean)}
      tags={item.tags.filter((tag) => !tag.startsWith("ai_")).map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
      jsonLd={[
        physicianJsonLd,
        articleJsonLd({
          path: `/casos-clinicos/${item.slug}`,
          headline: item.title,
          description: item.summary,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          articleSection: "Casos clínicos oncológicos",
          keywords: [item.tumorType, item.stage, ...item.biomarkers, ...item.tags].filter(Boolean)
        }),
        breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Casos clínicos", path: "/casos-clinicos" },
          { name: item.title, path: `/casos-clinicos/${item.slug}` }
        ])
      ]}
    />
  );
}
