import { ContentStatus, ContentType } from "@prisma/client";
import { db } from "@/lib/db";

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export async function getResearchItems() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.RESEARCH
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
    tags: toArray(item.tags)
  }));
}

export async function getPublishedResearchItems() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.RESEARCH,
      status: ContentStatus.PUBLISHED
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
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  }));
}

export async function getResearchBySlug(slug: string) {
  const item = await db.content.findUnique({
    where: { slug }
  });

  if (!item || item.type !== ContentType.RESEARCH) {
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
    tags: toArray(item.tags)
  };
}

export async function getPublishedResearchBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.RESEARCH,
      status: ContentStatus.PUBLISHED
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
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  };
}

export async function getResearchStats() {
  const [totalResearch, pendingReview, drafts] = await Promise.all([
    db.content.count({
      where: { type: ContentType.RESEARCH }
    }),
    db.content.count({
      where: {
        type: ContentType.RESEARCH,
        status: ContentStatus.PENDING_REVIEW
      }
    }),
    db.content.count({
      where: {
        type: ContentType.RESEARCH,
        status: ContentStatus.DRAFT
      }
    })
  ]);

  return {
    totalResearch,
    pendingReview,
    drafts
  };
}
