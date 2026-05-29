import { ContentStatus, ContentType } from "@prisma/client";
import { db } from "@/lib/db";
import { newsSources } from "@/lib/news/source-registry";

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
      oncologyData: true
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

export async function getPublishedNewsItems() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.PUBLISHED
    },
    include: {
      oncologyData: true
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }]
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    source: item.source ?? "manual",
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  }));
}

export async function getNewsItemBySlug(slug: string) {
  const item = await db.content.findUnique({
    where: { slug },
    include: {
      oncologyData: true
    }
  });

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
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers)
  };
}

export async function getPublishedNewsItemBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.PUBLISHED
    },
    include: {
      oncologyData: true
    }
  });

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
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  };
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
