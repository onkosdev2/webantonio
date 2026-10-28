import { ContentStatus, ContentType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import {
  publicContentCacheOptions,
  reviveOptionalPublicationDates,
  revivePublicationDates
} from "@/lib/content/public-cache";
import { newsSources } from "@/lib/news/source-registry";
import { buildPublicListingWhere, type PublicListingFilters } from "@/lib/content/public-listing";

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export async function getNewsItems() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.NEWS_ITEM
    },
    include: {
      oncologyData: true,
      media: {
        where: { isFeatured: true, mediaType: "image" },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    status: item.status,
    source: item.source ?? "manual",
    sourceUrl: item.sourceUrl ?? "",
    featuredImage: item.media[0]
      ? {
          src: item.media[0].storagePath,
          alt: item.media[0].altText || item.media[0].title,
          origin: item.media[0].origin
        }
      : null,
    tags: toArray(item.tags),
    generationLabel: toArray(item.tags).includes("ai_glm")
      ? "GLM 5.1"
      : toArray(item.tags).includes("ai_fallback")
        ? "Fallback local"
        : "Manual",
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers)
  }));
}

async function queryPublishedNewsItems(limit?: number, offset = 0, filters: PublicListingFilters = {}) {
  const items = await db.content.findMany({
    where: buildPublicListingWhere(ContentType.NEWS_ITEM, filters, true),
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      source: true,
      sourceUrl: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      oncologyData: {
        select: {
          tumorType: true,
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
          title: true,
          origin: true
        }
      }
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    skip: offset
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    source: item.source ?? "manual",
    sourceUrl: item.sourceUrl ?? "",
    featuredImage: item.media[0]
      ? {
          src: item.media[0].storagePath,
          alt: item.media[0].altText || item.media[0].title,
          origin: item.media[0].origin
        }
      : null,
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  }));
}

const getCachedPublishedNewsItems = unstable_cache(
  queryPublishedNewsItems,
  ["published-news-list-v3"],
  publicContentCacheOptions()
);

export async function getPublishedNewsItems(options: { limit?: number } = {}) {
  return (await getCachedPublishedNewsItems(options.limit)).map(revivePublicationDates);
}

export async function getPublishedNewsPage(
  filters: PublicListingFilters,
  page: number,
  pageSize: number
) {
  const where = buildPublicListingWhere(ContentType.NEWS_ITEM, filters, true);
  const total = await db.content.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const items = await getCachedPublishedNewsItems(pageSize, (currentPage - 1) * pageSize, filters);
  return {
    items: items.map(revivePublicationDates),
    total,
    page: currentPage,
    pageCount
  };
}

async function queryRecentPublishedNewsItems() {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  return db.content.findMany({
    where: {
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.PUBLISHED,
      publishedAt: { gte: cutoff },
      NOT: { title: { startsWith: "MAQUETA EDITORIAL", mode: "insensitive" } }
    },
    select: {
      slug: true,
      title: true,
      publishedAt: true
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 1000
  });
}

const getCachedRecentPublishedNewsItems = unstable_cache(
  queryRecentPublishedNewsItems,
  ["recent-published-news-sitemap-v2"],
  publicContentCacheOptions()
);

export async function getRecentPublishedNewsItems() {
  return (await getCachedRecentPublishedNewsItems()).map(reviveOptionalPublicationDates);
}

export async function getNewsItemBySlug(slug: string) {
  let item = await db.content.findUnique({
    where: { slug },
    include: {
      oncologyData: true,
      media: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!item) {
    const alias = await db.contentSlugAlias.findUnique({
      where: { slug },
      select: { contentId: true }
    });
    if (alias) {
      item = await db.content.findUnique({
        where: { id: alias.contentId },
        include: {
          oncologyData: true,
          media: { orderBy: { createdAt: "asc" } }
        }
      });
    }
  }

  if (!item || item.type !== ContentType.NEWS_ITEM) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    body: item.body,
    status: item.status,
    source: item.source ?? "",
    sourceUrl: item.sourceUrl ?? "",
    media: item.media.map((asset) => ({
      id: asset.id,
      title: asset.title,
      altText: asset.altText ?? "",
      storagePath: asset.storagePath,
      origin: asset.origin,
      isFeatured: asset.isFeatured
    })),
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers)
  };
}

async function queryPublishedNewsItemBySlug(slug: string) {
  let item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.PUBLISHED,
      NOT: { title: { startsWith: "MAQUETA EDITORIAL", mode: "insensitive" } }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      body: true,
      source: true,
      sourceUrl: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      oncologyData: {
        select: {
          tumorType: true,
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
          title: true,
          origin: true
        }
      }
    }
  });

  if (!item) {
    const alias = await db.contentSlugAlias.findUnique({
      where: { slug },
      select: { contentId: true }
    });
    if (alias) {
      item = await db.content.findFirst({
        where: {
          id: alias.contentId,
          type: ContentType.NEWS_ITEM,
          status: ContentStatus.PUBLISHED,
          NOT: { title: { startsWith: "MAQUETA EDITORIAL", mode: "insensitive" } }
        },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          body: true,
          source: true,
          sourceUrl: true,
          tags: true,
          publishedAt: true,
          updatedAt: true,
          oncologyData: {
            select: {
              tumorType: true,
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
              title: true,
              origin: true
            }
          }
        }
      });
    }
  }

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    body: item.body,
    source: item.source ?? "",
    sourceUrl: item.sourceUrl ?? "",
    featuredImage: item.media[0]
      ? {
          src: item.media[0].storagePath,
          alt: item.media[0].altText || item.media[0].title,
          origin: item.media[0].origin
        }
      : null,
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  };
}

const getCachedPublishedNewsItemBySlug = unstable_cache(
  queryPublishedNewsItemBySlug,
  ["published-news-detail-v3"],
  publicContentCacheOptions()
);

export async function getPublishedNewsItemBySlug(slug: string) {
  const item = await getCachedPublishedNewsItemBySlug(slug);
  return item ? revivePublicationDates(item) : null;
}

export async function getNewsStats() {
  const [totalNews, pendingReview, drafts, latestBatch] = await Promise.all([
    db.content.count({
      where: { type: ContentType.NEWS_ITEM }
    }),
    db.content.count({
      where: {
        type: ContentType.NEWS_ITEM,
        status: ContentStatus.PENDING_REVIEW
      }
    }),
    db.content.count({
      where: {
        type: ContentType.NEWS_ITEM,
        status: ContentStatus.DRAFT
      }
    }),
    db.importLog.findFirst({
      where: {
        source: "system:news-ingest-engine",
        payloadType: "news_batch"
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  let lastRunSummary = "";
  let lastFetched = 0;
  let lastCreated = 0;
  let lastSkipped = 0;
  let failedSources: string[] = [];

  if (latestBatch?.notes) {
    try {
      const parsed = JSON.parse(latestBatch.notes) as {
        fetchedItems?: number;
        createdCount?: number;
        skippedCount?: number;
        failedSources?: string[];
      };
      lastFetched = parsed.fetchedItems ?? 0;
      lastCreated = parsed.createdCount ?? 0;
      lastSkipped = parsed.skippedCount ?? 0;
      failedSources = Array.isArray(parsed.failedSources)
        ? parsed.failedSources.filter((item): item is string => typeof item === "string")
        : [];
      lastRunSummary = latestBatch.payloadSummary;
    } catch {
      lastRunSummary = latestBatch.payloadSummary;
    }
  }

  return {
    totalNews,
    pendingReview,
    drafts,
    activeSources: newsSources.length,
    lastRunAt: latestBatch?.createdAt ?? null,
    lastRunSummary,
    lastFetched,
    lastCreated,
    lastSkipped,
    failedSources
  };
}
