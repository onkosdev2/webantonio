import { PublicCollectionPage } from "@/components/editorial/public-collection-page";
import {
  filterPublicArchiveItems,
  getArchiveFilterOptions,
  getPublicArchiveItems,
  getTypeLabel
} from "@/lib/content/public";
import { getSearchParamValue } from "@/lib/content/public-query";

type BuscarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const typeOptions = [
  { value: "clinical_case", label: "Caso clinico" },
  { value: "news_item", label: "Noticia oncologica" },
  { value: "editorial", label: "Editorial" },
  { value: "research", label: "Investigacion" },
  { value: "reflection", label: "Reflexion" },
  { value: "story", label: "Historia" }
] as const;

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const type = getSearchParamValue(resolvedSearchParams, "type");
  const tumor = getSearchParamValue(resolvedSearchParams, "tumor");
  const biomarker = getSearchParamValue(resolvedSearchParams, "biomarker");
  const tag = getSearchParamValue(resolvedSearchParams, "tag");

  const items = await getPublicArchiveItems();
  const filteredItems = filterPublicArchiveItems(items, {
    q,
    type: type as
      | "clinical_case"
      | "news_item"
      | "editorial"
      | "research"
      | "reflection"
      | "story"
      | "",
    tumor,
    biomarker,
    tag
  });
  const filterOptions = getArchiveFilterOptions(items);

  return (
    <PublicCollectionPage
      kicker="Busqueda Global"
      title="Buscar en el archivo oncológico"
      description="Un punto de entrada transversal para localizar casos, noticias, editoriales, investigacion, reflexiones e historias sin romper la lectura editorial del sitio."
      signature="Archivo clínico de autor con navegación silenciosa"
      countLabel="resultados publicados"
      itemCount={filteredItems.length}
      searchAction="/buscar"
      searchQuery={q}
      filters={[
        {
          label: "Tipo de pieza",
          name: "type",
          options: typeOptions.map((item) => item),
          value: type
        },
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
        },
        {
          label: "Etiqueta",
          name: "tag",
          options: filterOptions.tags,
          value: tag
        }
      ]}
      clearHref="/buscar"
      items={filteredItems.map((item) => ({
        href: item.href,
        title: item.title,
        summary: item.summary,
        eyebrow: getTypeLabel(item.type),
        meta: item.meta
      }))}
      emptyTitle="No encontramos piezas con esos criterios."
      emptyCopy="Ajusta la búsqueda o limpia los filtros para explorar el archivo publicado completo."
    />
  );
}
