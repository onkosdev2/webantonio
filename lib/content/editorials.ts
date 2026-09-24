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

async function queryPublishedEditorials() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.EDITORIAL,
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

const getCachedPublishedEditorials = unstable_cache(
  queryPublishedEditorials,
  ["published-editorials-list-v2"],
  publicContentCacheOptions()
);

export async function getPublishedEditorials() {
  return (await getCachedPublishedEditorials()).map(revivePublicationDates);
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

async function queryPublishedEditorialBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.EDITORIAL,
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

const getCachedPublishedEditorialBySlug = unstable_cache(
  queryPublishedEditorialBySlug,
  ["published-editorial-detail-v2"],
  publicContentCacheOptions()
);

export async function getPublishedEditorialBySlug(slug: string) {
  const item = await getCachedPublishedEditorialBySlug(slug);
  return item ? revivePublicationDates(item) : null;
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
