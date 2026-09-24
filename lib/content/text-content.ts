import { ContentStatus, ContentType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import {
  publicContentCacheOptions,
  revivePublicationDates
} from "@/lib/content/public-cache";

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

async function queryPublishedTextContentItems(type: SupportedTextType) {
  const items = await db.content.findMany({
    where: {
      type,
      status: ContentStatus.PUBLISHED
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      source: true,
      tags: true,
      publishedAt: true,
      updatedAt: true
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

const getCachedPublishedTextContentItems = unstable_cache(
  queryPublishedTextContentItems,
  ["published-text-content-list-v2"],
  publicContentCacheOptions()
);

export async function getPublishedTextContentItems(type: SupportedTextType) {
  return (await getCachedPublishedTextContentItems(type)).map(revivePublicationDates);
}

async function queryPublishedTextContentBySlug(
  type: SupportedTextType,
  slug: string
) {
  const item = await db.content.findFirst({
    where: {
      type,
      slug,
      status: ContentStatus.PUBLISHED
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      body: true,
      source: true,
      tags: true,
      publishedAt: true,
      updatedAt: true
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

const getCachedPublishedTextContentBySlug = unstable_cache(
  queryPublishedTextContentBySlug,
  ["published-text-content-detail-v2"],
  publicContentCacheOptions()
);

export async function getPublishedTextContentBySlug(
  type: SupportedTextType,
  slug: string
) {
  const item = await getCachedPublishedTextContentBySlug(type, slug);
  return item ? revivePublicationDates(item) : null;
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
