import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { NewsLiveUpdates } from "@/components/editorial/clinical-cases-live-updates";
import { getSearchParamValue } from "@/lib/content/public-query";
import {
  filterPublicArchiveItems,
  getArchiveFilterOptions
} from "@/lib/content/public";
import { getPublishedNewsItems } from "@/lib/content/news";
import { formatPublicPublicationDate } from "@/lib/content/public-dates";

type NoticiasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NoticiasPage({ searchParams }: NoticiasPageProps) {
  const items = await getPublishedNewsItems();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const tumor = getSearchParamValue(resolvedSearchParams, "tumor");
  const biomarker = getSearchParamValue(resolvedSearchParams, "biomarker");
  const baseItems = items.map((item) => ({
    href: `/noticias/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Noticia oncológica",
    type: "news_item" as const,
    tumorType: item.tumorType || "",
    biomarkers: item.biomarkers,
    tags: item.tags,
    image: item.featuredImage,
    publishedAt: item.publishedAt ?? item.updatedAt,
    meta: [
      item.source || "",
      item.tumorType || "",
      item.biomarkers.length > 0
        ? `Biomarcadores: ${item.biomarkers.join(", ")}`
        : ""
    ].filter(Boolean)
  }));
  const filteredItems = filterPublicArchiveItems(baseItems, {
    q,
    tumor,
    biomarker
  });
  const filterOptions = getArchiveFilterOptions(baseItems);

  return (
    <>
      <NewsLiveUpdates />
      <PublicCollectionPage
      kicker="Vigilancia oncológica"
      title="Noticias Oncológicas"
      description="Avances en oncología explicados con contexto para distinguir qué cambia, para quién y con qué alcance."
      signature="Actualidad clínica sin perder el contexto"
      countLabel="noticias publicadas"
      itemCount={filteredItems.length}
      searchAction="/noticias"
      searchQuery={q}
      filters={[
        {
          label: "Tumor",
          name: "tumor",
          options: filterOptions.tumors,
          value: tumor
        },
        {
          label: "Biomarcador",
          name: "biomarker",
          options: filterOptions.biomarkers,
          value: biomarker
        }
      ]}
      clearHref="/noticias"
      items={filteredItems.map((item) => {
        const meta: Array<string | { label: string; href?: string }> = [];
        const publicationDate = formatPublicPublicationDate(item.publishedAt);

        if (!tumor && item.tumorType) {
          meta.push({
            label: item.tumorType,
            href: `/noticias?tumor=${encodeURIComponent(item.tumorType)}`
          });
        }

        for (const metaItem of item.meta?.slice(2) ?? []) {
          if (metaItem.startsWith("Biomarcadores: ") && item.biomarkers?.[0]) {
            meta.push({
              label: metaItem,
              href: `/noticias?biomarker=${encodeURIComponent(item.biomarkers[0])}`
            });
          } else {
            meta.push(metaItem);
          }
        }

        return {
          href: item.href,
          title: item.title,
          summary: item.summary,
          eyebrow: item.meta?.[0] || "Noticia",
          image: item.image,
          publicationDate,
          meta
        };
      })}
      emptyTitle="Todavía no hay noticias publicadas."
      emptyCopy="El radar oncológico ya genera y revisa borradores, pero esta vista pública solo expone piezas ya publicadas."
      />
    </>
  );
}
