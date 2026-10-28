import type { Metadata } from "next";
import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import { NewsLiveUpdates } from "@/components/editorial/clinical-cases-live-updates";
import { getSearchParamValue } from "@/lib/content/public-query";
import { getPublishedNewsPage } from "@/lib/content/news";
import { formatPublicPublicationDate } from "@/lib/content/public-dates";
import {
  PUBLIC_ARCHIVE_PAGE_SIZE,
  parsePublicArchivePage
} from "@/lib/content/public-listing";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Noticias Oncológicas | Dr. Antonio Camargo",
  description:
    "Actualidad oncológica, avances terapéuticos, biomarcadores y evidencia clínica explicados con contexto médico.",
  path: "/noticias",
  keywords: [
    "noticias oncológicas",
    "avances en cáncer",
    "tratamientos oncológicos",
    "biomarcadores en cáncer"
  ]
});

type NoticiasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NoticiasPage({ searchParams }: NoticiasPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const tumor = getSearchParamValue(resolvedSearchParams, "tumor");
  const biomarker = getSearchParamValue(resolvedSearchParams, "biomarker");
  const requestedPage = parsePublicArchivePage(getSearchParamValue(resolvedSearchParams, "page"));
  const { items, total, page, pageCount } = await getPublishedNewsPage(
    { q, tumor, biomarker },
    requestedPage,
    PUBLIC_ARCHIVE_PAGE_SIZE
  );
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
  const filteredItems = baseItems;
  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tumor) params.set("tumor", tumor);
    if (biomarker) params.set("biomarker", biomarker);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/noticias?${query}` : "/noticias";
  };

  return (
    <>
      <NewsLiveUpdates />
      <PublicCollectionPage
      kicker="Vigilancia oncológica"
      title="Noticias Oncológicas"
      description="Avances en oncología explicados con contexto para distinguir qué cambia, para quién y con qué alcance."
      signature="Actualidad clínica sin perder el contexto"
      countLabel="noticias publicadas"
      itemCount={total}
      searchAction="/noticias"
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
      clearHref="/noticias"
      pagination={{ page, pageCount, hrefForPage }}
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
