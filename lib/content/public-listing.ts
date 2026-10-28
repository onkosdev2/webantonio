import { ContentType, Prisma } from "@prisma/client";

export const PUBLIC_ARCHIVE_PAGE_SIZE = 12;

export type PublicListingFilters = {
  q?: string;
  tumor?: string;
  biomarker?: string;
};

export function parsePublicArchivePage(value?: string) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function buildPublicListingWhere(
  type: ContentType,
  filters: PublicListingFilters = {},
  excludeEditorialMocks = false
): Prisma.ContentWhereInput {
  const and: Prisma.ContentWhereInput[] = [];
  const query = filters.q?.trim();

  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { source: { contains: query, mode: "insensitive" } },
        { tags: { array_contains: [query] } },
        {
          oncologyData: {
            is: {
              OR: [
                { tumorType: { contains: query, mode: "insensitive" } },
                { biomarkers: { array_contains: [query] } },
                ...(type === ContentType.CLINICAL_CASE
                  ? [{ stage: { contains: query, mode: "insensitive" as const } }]
                  : [])
              ]
            }
          }
        }
      ]
    });
  }

  if (filters.tumor?.trim()) {
    and.push({
      oncologyData: {
        is: { tumorType: { contains: filters.tumor.trim(), mode: "insensitive" } }
      }
    });
  }

  if (filters.biomarker?.trim()) {
    and.push({
      oncologyData: {
        is: { biomarkers: { array_contains: [filters.biomarker.trim()] } }
      }
    });
  }

  return {
    type,
    status: "PUBLISHED",
    ...(excludeEditorialMocks
      ? { NOT: { title: { startsWith: "MAQUETA EDITORIAL", mode: "insensitive" } } }
      : {}),
    ...(and.length ? { AND: and } : {})
  };
}
