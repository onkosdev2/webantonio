import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedClinicalCaseBySlug } from "@/lib/content/cases";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";

type CasoClinicoPublicoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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

  return (
    <PublicArticlePage
      kicker="Caso clinico publicado"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/casos-clinicos"
      backLabel="Volver a casos"
      meta={[
        item.tumorType
          ? {
              label: `Tumor: ${item.tumorType}`,
              href: `/casos-clinicos?tumor=${encodeURIComponent(item.tumorType)}`
            }
          : "",
        item.stage ? `Estadio: ${item.stage}` : "",
        item.treatmentLine ? `Linea: ${item.treatmentLine}` : "",
        item.response ? `Respuesta: ${item.response}` : ""
      ].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/buscar?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
    />
  );
}
