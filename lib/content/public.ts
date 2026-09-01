import { getPublishedClinicalCases } from "@/lib/content/cases";
import { getPublishedEditorials } from "@/lib/content/editorials";
import { getPublishedNewsItems } from "@/lib/content/news";
import { getPublishedResearchItems } from "@/lib/content/research";
import { getPublishedTextContentItems } from "@/lib/content/text-content";

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

export async function getPublicArchiveItems() {
  const [cases, news, editorials, research, reflections, stories] = await Promise.all([
    getPublishedClinicalCases(),
    getPublishedNewsItems(),
    getPublishedEditorials(),
    getPublishedResearchItems(),
    getPublishedTextContentItems("REFLECTION"),
    getPublishedTextContentItems("STORY")
  ]);

  const caseItems: PublicArchiveItem[] = cases.map((item) => ({
    href: `/casos-clinicos/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Caso clínico",
    type: "clinical_case",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    tumorType: item.tumorType,
    biomarkers: item.biomarkers,
    tags: item.tags,
    meta: [
      item.tumorType || "",
      item.stage ? `Estadio ${item.stage}` : "",
      item.biomarkers.length > 0
        ? `Biomarcadores: ${item.biomarkers.join(", ")}`
        : ""
    ].filter(Boolean)
  }));

  const newsItems: PublicArchiveItem[] = news.map((item) => ({
    href: `/noticias/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Noticia oncológica",
    type: "news_item",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    tumorType: item.tumorType,
    biomarkers: item.biomarkers,
    tags: item.tags,
    source: item.source,
    image: item.featuredImage,
    meta: [
      item.source || "",
      item.tumorType || "",
      item.biomarkers.length > 0
        ? `Biomarcadores: ${item.biomarkers.join(", ")}`
        : ""
    ].filter(Boolean)
  }));

  const editorialItems: PublicArchiveItem[] = editorials.map((item) => ({
    href: `/editoriales/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Editorial",
    type: "editorial",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    tags: item.tags,
    source: item.source,
    meta: [item.source || "", ...item.tags.slice(0, 3)].filter(Boolean)
  }));

  const researchItems: PublicArchiveItem[] = research.map((item) => ({
    href: `/investigacion/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Investigación",
    type: "research",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    tags: item.tags,
    source: item.source,
    meta: [item.source || "", ...item.tags.slice(0, 3)].filter(Boolean)
  }));

  const reflectionItems: PublicArchiveItem[] = reflections.map((item) => ({
    href: `/reflexiones/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Reflexión",
    type: "reflection",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    tags: item.tags,
    source: item.source,
    meta: item.tags.slice(0, 3)
  }));

  const storyItems: PublicArchiveItem[] = stories.map((item) => ({
    href: `/historias/${item.slug}`,
    title: item.title,
    summary: item.summary,
    kicker: "Historia",
    type: "story",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    tags: item.tags,
    source: item.source,
    meta: item.tags.slice(0, 3)
  }));

  return [
    ...caseItems,
    ...newsItems,
    ...editorialItems,
    ...researchItems,
    ...reflectionItems,
    ...storyItems
  ].sort((left, right) => {
    const leftTime = left.publishedAt?.getTime() ?? 0;
    const rightTime = right.publishedAt?.getTime() ?? 0;
    return rightTime - leftTime;
  });
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
