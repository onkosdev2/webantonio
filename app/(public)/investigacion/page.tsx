import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { getSearchParamValue } from "@/lib/content/public-query";
import {
  filterPublicArchiveItems,
  getArchiveFilterOptions
} from "@/lib/content/public";
import { getPublishedResearchItems } from "@/lib/content/research";

type InvestigacionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvestigacionPage({
  searchParams
}: InvestigacionPageProps) {
  const items = await getPublishedResearchItems();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const tag = getSearchParamValue(resolvedSearchParams, "tag");
  const baseItems = items.map((item) => ({
    href: `/investigacion/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Investigacion",
    type: "research" as const,
    tags: item.tags,
    source: item.source,
    meta: item.tags
  }));
  const filteredItems = filterPublicArchiveItems(baseItems, {
    q,
    tag
  });
  const filterOptions = getArchiveFilterOptions(baseItems);

  return (
    <PublicCollectionPage
      kicker="Investigacion"
      title="Investigacion"
      description="Lectura critica de evidencia clinica, biomarcadores, estudios y avances oncologicos seleccionados por utilidad practica."
      signature="Evidencia, criterio clinico y mirada academica"
      countLabel="piezas de investigacion publicadas"
      itemCount={filteredItems.length}
      searchAction="/investigacion"
      searchQuery={q}
      filters={[
        {
          label: "Etiqueta",
          name: "tag",
          options: filterOptions.tags,
          value: tag
        }
      ]}
      clearHref="/investigacion"
      items={filteredItems.map((item) => ({
        href: item.href,
        title: item.title,
        summary: item.summary,
        eyebrow: item.source || "Investigacion",
        meta: (item.meta ?? []).map((metaItem) =>
          typeof metaItem === "string"
            ? {
                label: metaItem,
                href: `/investigacion?tag=${encodeURIComponent(metaItem)}`
              }
            : metaItem
        )
      }))}
      emptyTitle="Todavía no hay piezas de investigación publicadas."
      emptyCopy="La cola IA ya puede crear borradores de investigación; esta vista pública solo mostrará piezas revisadas y publicadas."
    />
  );
}
