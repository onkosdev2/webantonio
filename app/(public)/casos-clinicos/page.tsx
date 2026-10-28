import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { ClinicalCasesLiveUpdates } from "@/components/editorial/clinical-cases-live-updates";
import { getSearchParamValue } from "@/lib/content/public-query";
import { getPublishedClinicalCasesPage } from "@/lib/content/cases";
import { formatPublicPublicationDate } from "@/lib/content/public-dates";
import {
  PUBLIC_ARCHIVE_PAGE_SIZE,
  parsePublicArchivePage
} from "@/lib/content/public-listing";

type CasosClinicosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CasosClinicosPage({
  searchParams
}: CasosClinicosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const tumor = getSearchParamValue(resolvedSearchParams, "tumor");
  const biomarker = getSearchParamValue(resolvedSearchParams, "biomarker");
  const requestedPage = parsePublicArchivePage(getSearchParamValue(resolvedSearchParams, "page"));
  const { items, total, page, pageCount } = await getPublishedClinicalCasesPage(
    { q, tumor, biomarker },
    requestedPage,
    PUBLIC_ARCHIVE_PAGE_SIZE
  );
  const baseItems = items.map((item) => ({
    href: `/casos-clinicos/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Caso clínico",
    type: "clinical_case" as const,
    tumorType: item.tumorType || "",
    biomarkers: item.biomarkers,
    image: item.featuredImage,
    publishedAt: item.publishedAt ?? item.updatedAt,
    tags: item.tags,
    meta: [
      item.stage ? `Estadio ${item.stage}` : "",
      item.biomarkers.length > 0
        ? `Biomarcadores: ${item.biomarkers.join(", ")}`
        : ""
    ].filter(Boolean)
  }));
  const filteredItems = baseItems;
  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tumor) params.set("tumor", tumor);
    if (biomarker) params.set("biomarker", biomarker);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/casos-clinicos?${query}` : "/casos-clinicos";
  };

  return (
    <>
      <ClinicalCasesLiveUpdates />
      <PublicCollectionPage
      kicker="Archivo clínico"
      title="Casos Clínicos Oncológicos"
      description="Casos organizados por diagnóstico, biomarcadores, tratamiento y evolución, con aprendizajes para la práctica clínica."
      signature="Decisiones clínicas explicadas con contexto"
      countLabel="casos clínicos publicados"
      itemCount={total}
      searchAction="/casos-clinicos"
      searchQuery={q}
      filters={[
        {
          label: "Tumor",
          name: "tumor",
          input: true,
          value: tumor
        },
        {
          label: "Biomarcador",
          name: "biomarker",
          input: true,
          value: biomarker
        }
      ]}
      clearHref="/casos-clinicos"
      pagination={{ page, pageCount, hrefForPage }}
      items={filteredItems.map((item) => {
        const meta: Array<string | { label: string; href?: string }> = [];
        const publicationDate = formatPublicPublicationDate(item.publishedAt);

        if (!tumor && item.tumorType) {
          meta.push({
            label: item.tumorType,
            href: `/casos-clinicos?tumor=${encodeURIComponent(item.tumorType)}`
          });
        }

        for (const metaItem of item.meta ?? []) {
          if (metaItem.startsWith("Biomarcadores: ") && item.biomarkers?.[0]) {
            meta.push({
              label: metaItem,
              href: `/casos-clinicos?biomarker=${encodeURIComponent(item.biomarkers[0])}`
            });
          } else {
            meta.push(metaItem);
          }
        }

        return {
          href: item.href,
          title: item.title,
          summary: item.summary,
          eyebrow: item.tumorType || "Caso clínico",
          image: item.image,
          publicationDate,
          meta
        };
      })}
      emptyTitle="Todavía no hay casos clínicos publicados."
      emptyCopy="El archivo clínico privado ya funciona, pero esta sección pública solo mostrará los casos que marques como PUBLISHED."
      />
    </>
  );
}
