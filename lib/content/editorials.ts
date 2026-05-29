import { ContentStatus, ContentType } from "@prisma/client";
import { db } from "@/lib/db";

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export async function getEditorials() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.EDITORIAL
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

export async function getPublishedEditorials() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.EDITORIAL,
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

export async function getEditorialBySlug(slug: string) {
  const item = await db.content.findUnique({
    where: { slug }
  });

  if (!item || item.type !== ContentType.EDITORIAL) {
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

export async function getPublishedEditorialBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.EDITORIAL,
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

export async function getEditorialStats() {
  const [totalEditorials, pendingReview, drafts] = await Promise.all([
    db.content.count({
      where: { type: ContentType.EDITORIAL }
    }),
    db.content.count({
      where: {
        type: ContentType.EDITORIAL,
        status: ContentStatus.PENDING_REVIEW
      }
    }),
    db.content.count({
      where: {
        type: ContentType.EDITORIAL,
        status: ContentStatus.DRAFT
      }
    })
  ]);

  return {
    totalEditorials,
    pendingReview,
    drafts
  };
}
