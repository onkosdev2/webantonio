import { ContentStatus, ContentType } from "@prisma/client";
import { db } from "@/lib/db";

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

type SupportedTextType = "REFLECTION" | "STORY";

export async function getTextContentItems(type: SupportedTextType) {
  const items = await db.content.findMany({
    where: { type },
    orderBy: [{ updatedAt: "desc" }]
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    body: item.body,
    status: item.status,
    source: item.source ?? "manual",
    tags: toArray(item.tags),
    updatedAt: item.updatedAt
  }));
}

export async function getTextContentBySlug(type: SupportedTextType, slug: string) {
  const item = await db.content.findFirst({
    where: {
      type,
      slug
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
    status: item.status,
    source: item.source ?? "",
    tags: toArray(item.tags),
    updatedAt: item.updatedAt
  };
}

export async function getPublishedTextContentItems(type: SupportedTextType) {
  const items = await db.content.findMany({
    where: {
      type,
      status: ContentStatus.PUBLISHED
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }]
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    body: item.body,
    source: item.source ?? "manual",
    tags: toArray(item.tags),
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  }));
}

export async function getPublishedTextContentBySlug(
  type: SupportedTextType,
  slug: string
) {
  const item = await db.content.findFirst({
    where: {
      type,
      slug,
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

export async function getTextContentStats(type: SupportedTextType) {
  const [totalItems, pendingReview, drafts, published] = await Promise.all([
    db.content.count({ where: { type } }),
    db.content.count({
      where: {
        type,
        status: ContentStatus.PENDING_REVIEW
      }
    }),
    db.content.count({
      where: {
        type,
        status: ContentStatus.DRAFT
      }
    }),
    db.content.count({
      where: {
        type,
        status: ContentStatus.PUBLISHED
      }
    })
  ]);

  return {
    totalItems,
    pendingReview,
    drafts,
    published
  };
}
