import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { getSearchParamValue } from "@/lib/content/public-query";
import {
  filterPublicArchiveItems,
  getArchiveFilterOptions
} from "@/lib/content/public";
import { getPublishedEditorials } from "@/lib/content/editorials";

type EditorialesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditorialesPage({
  searchParams
}: EditorialesPageProps) {
  const items = await getPublishedEditorials();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const tag = getSearchParamValue(resolvedSearchParams, "tag");
  const baseItems = items.map((item) => ({
    href: `/editoriales/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Editorial",
    type: "editorial" as const,
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
      kicker="Criterio Medico"
      title="Editoriales"
      description="Analisis, posicionamiento y lectura clinica sobre oncologia, innovacion, acceso, etica y practica asistencial."
      signature="Una voz profesional con peso clinico y forma editorial"
      countLabel="editoriales publicadas"
      itemCount={filteredItems.length}
      searchAction="/editoriales"
      searchQuery={q}
      filters={[
        {
          label: "Etiqueta",
          name: "tag",
          options: filterOptions.tags,
          value: tag
        }
      ]}
      clearHref="/editoriales"
      items={filteredItems.map((item) => ({
        href: item.href,
        title: item.title,
        summary: item.summary,
        eyebrow: item.source || "Editorial",
        meta: (item.meta ?? []).map((metaItem) =>
          typeof metaItem === "string"
            ? {
                label: metaItem,
                href: `/editoriales?tag=${encodeURIComponent(metaItem)}`
              }
            : metaItem
        )
      }))}
      emptyTitle="Todavía no hay editoriales publicadas."
      emptyCopy="Las editoriales ya pueden redactarse y editarse desde el panel, pero solo aparecerán aquí cuando estén en estado PUBLISHED."
    />
  );
}
