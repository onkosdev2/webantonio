import { ContentStatus, ContentType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import {
  publicContentCacheOptions
} from "@/lib/content/public-cache";

export type PublicArchiveType =
  | "clinical_case"
  | "news_item"
  | "editorial"
  | "research"
  | "reflection"
  | "story";

export type PublicArchiveFilters = {
  q?: string;
  type?: PublicArchiveType | "";
  tumor?: string;
  biomarker?: string;
  tag?: string;
};

export type PublicArchiveItem = {
  href: string;
  title: string;
  summary: string;
  kicker: string;
  type: PublicArchiveType;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  tumorType?: string;
  biomarkers?: string[];
  tags?: string[];
  source?: string;
  meta?: string[];
  image?: {
    src: string;
    alt: string;
  } | null;
};

type PublicHomeItem = {
  href: string;
  title: string;
  summary: string;
  kicker: string;
};

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesNormalized(haystack: string, needle: string) {
  return normalize(haystack).includes(normalize(needle));
}

function matchesQuery(item: PublicArchiveItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.summary,
    item.kicker,
    item.tumorType ?? "",
    ...(item.biomarkers ?? []),
    ...(item.tags ?? []),
    ...(item.meta ?? [])
  ].join(" ");

  return includesNormalized(haystack, query);
}

export function filterPublicArchiveItems(
  items: PublicArchiveItem[],
  filters: PublicArchiveFilters
) {
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) {
      return false;
    }

    if (filters.tumor && item.tumorType !== filters.tumor) {
      return false;
    }

    if (
      filters.biomarker &&
      !(item.biomarkers ?? []).some((marker) => marker === filters.biomarker)
    ) {
      return false;
    }

    if (filters.tag && !(item.tags ?? []).some((tag) => tag === filters.tag)) {
      return false;
    }

    if (!matchesQuery(item, filters.q ?? "")) {
      return false;
    }

    return true;
  });
}

export function getArchiveFilterOptions(items: PublicArchiveItem[]) {
  const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();

  return {
    tumors: unique(items.map((item) => item.tumorType ?? "")),
    biomarkers: unique(items.flatMap((item) => item.biomarkers ?? [])),
    tags: unique(items.flatMap((item) => item.tags ?? []))
  };
}

export function getTypeLabel(type: PublicArchiveType) {
  switch (type) {
    case "clinical_case":
      return "Caso clínico";
    case "news_item":
      return "Noticia oncológica";
    case "editorial":
      return "Editorial";
    case "research":
      return "Investigación";
    case "reflection":
      return "Reflexión";
    case "story":
      return "Historia";
  }
}

function countSharedValues(left: string[] = [], right: string[] = []) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}

export function getRelatedPublicItems(
  items: PublicArchiveItem[],
  current: {
    href: string;
    type: PublicArchiveType;
    tumorType?: string;
    biomarkers?: string[];
    tags?: string[];
  },
  limit = 3
) {
  return items
    .filter((item) => item.href !== current.href)
    .map((item) => {
      let score = 0;

      if (item.type === current.type) {
        score += 4;
      }

      if (current.tumorType && item.tumorType === current.tumorType) {
        score += 3;
      }

      score += countSharedValues(item.biomarkers, current.biomarkers) * 3;
      score += countSharedValues(item.tags, current.tags) * 2;

      return {
        ...item,
        score
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

async function queryPublicArchiveItems(): Promise<PublicArchiveItem[]> {
  const items = await db.content.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      type: {
        in: [
          ContentType.CLINICAL_CASE,
          ContentType.NEWS_ITEM,
          ContentType.EDITORIAL,
          ContentType.RESEARCH,
          ContentType.REFLECTION,
          ContentType.STORY
        ]
      },
      NOT: {
        AND: [
          { type: ContentType.NEWS_ITEM },
          { title: { startsWith: "MAQUETA EDITORIAL", mode: "insensitive" } }
        ]
      }
    },
    select: {
      type: true,
      slug: true,
      title: true,
      summary: true,
      source: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      oncologyData: {
        select: {
          tumorType: true,
          stage: true,
          biomarkers: true
        }
      },
      media: {
        where: { isFeatured: true, mediaType: "image" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          storagePath: true,
          altText: true,
          title: true
        }
      }
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }]
  });

  return items.map((item): PublicArchiveItem => {
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const biomarkers = Array.isArray(item.oncologyData?.biomarkers)
      ? item.oncologyData.biomarkers.filter(
          (biomarker): biomarker is string => typeof biomarker === "string"
        )
      : [];
    const tumorType = item.oncologyData?.tumorType ?? "";
    const common = {
      title: item.title,
      summary: item.summary,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
      tags
    };

    switch (item.type) {
      case ContentType.CLINICAL_CASE:
        return {
          ...common,
          href: `/casos-clinicos/${item.slug}`,
          kicker: "Caso clínico",
          type: "clinical_case",
          tumorType,
          biomarkers,
          meta: [
            tumorType,
            item.oncologyData?.stage ? `Estadio ${item.oncologyData.stage}` : "",
            biomarkers.length > 0 ? `Biomarcadores: ${biomarkers.join(", ")}` : ""
          ].filter(Boolean)
        };
      case ContentType.NEWS_ITEM:
        return {
          ...common,
          href: `/noticias/${item.slug}`,
          kicker: "Noticia oncológica",
          type: "news_item",
          tumorType,
          biomarkers,
          source: item.source ?? "manual",
          image: item.media[0]
            ? {
                src: item.media[0].storagePath,
                alt: item.media[0].altText || item.media[0].title || item.title
              }
            : null,
          meta: [
            item.source ?? "manual",
            tumorType,
            biomarkers.length > 0 ? `Biomarcadores: ${biomarkers.join(", ")}` : ""
          ].filter(Boolean)
        };
      case ContentType.EDITORIAL:
        return {
          ...common,
          href: `/editoriales/${item.slug}`,
          kicker: "Editorial",
          type: "editorial",
          source: item.source ?? "manual",
          meta: [item.source ?? "manual", ...tags.slice(0, 3)].filter(Boolean)
        };
      case ContentType.RESEARCH:
        return {
          ...common,
          href: `/investigacion/${item.slug}`,
          kicker: "Investigación",
          type: "research",
          source: item.source ?? "manual",
          meta: [item.source ?? "manual", ...tags.slice(0, 3)].filter(Boolean)
        };
      case ContentType.REFLECTION:
        return {
          ...common,
          href: `/reflexiones/${item.slug}`,
          kicker: "Reflexión",
          type: "reflection",
          source: item.source ?? "manual",
          meta: tags.slice(0, 3)
        };
      case ContentType.STORY:
        return {
          ...common,
          href: `/historias/${item.slug}`,
          kicker: "Historia",
          type: "story",
          source: item.source ?? "manual",
          meta: tags.slice(0, 3)
        };
      default:
        throw new Error(`Unsupported public content type: ${item.type}`);
    }
  });
}

const getCachedPublicArchiveItems = unstable_cache(
  queryPublicArchiveItems,
  ["public-archive-v3"],
  publicContentCacheOptions()
);

function reviveArchiveDate(value: Date | string | null | undefined) {
  if (value == null) return value;
  return value instanceof Date ? value : new Date(value);
}

export async function getPublicArchiveItems(): Promise<PublicArchiveItem[]> {
  const items = (await getCachedPublicArchiveItems()) as Array<
    Omit<PublicArchiveItem, "publishedAt" | "updatedAt"> & {
      publishedAt?: Date | string | null;
      updatedAt?: Date | string | null;
    }
  >;

  return items.map((item) => ({
    ...item,
    publishedAt: reviveArchiveDate(item.publishedAt),
    updatedAt: reviveArchiveDate(item.updatedAt)
  }));
}

export async function getPublicHomeFeed() {
  const items = await getPublicArchiveItems();

  const counts = {
    cases: items.filter((item) => item.type === "clinical_case").length,
    news: items.filter((item) => item.type === "news_item").length,
    editorials: items.filter((item) => item.type === "editorial").length,
    research: items.filter((item) => item.type === "research").length
  };

  const latestPublished: PublicHomeItem[] = items.slice(0, 6).map((item) => ({
    href: item.href,
    title: item.title,
    summary: item.summary,
    kicker: item.kicker
  }));

  return {
    counts,
    latestPublished
  };
}
