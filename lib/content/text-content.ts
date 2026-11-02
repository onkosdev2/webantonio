import { ContentStatus, ContentType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { firstEditorialBodyImage } from "@/lib/content/editorial-card-image";
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
      body: true,
      source: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      media: {
        where: { mediaType: "image", isSensitive: false, isGalleryUpload: false },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { storagePath: true, altText: true, title: true, origin: true }
      }
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
    image: item.media[0] ? {
      src: item.media[0].storagePath,
      alt: item.media[0].altText || item.media[0].title || item.title,
      origin: item.media[0].origin
    } : firstEditorialBodyImage(item.body),
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
      updatedAt: true,
      media: {
        where: { isFeatured: true, mediaType: "image", isSensitive: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { storagePath: true, altText: true, title: true, origin: true }
      }
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
    featuredImage: item.media[0] ? {
      src: item.media[0].storagePath,
      alt: item.media[0].altText || item.media[0].title || item.title,
      origin: item.media[0].origin
    } : null,
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
