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

function extractResearchReferences(source: string | null | undefined) {
  const match = source?.trim().match(/^Fuentes:\s*([\s\S]+)$/i);
  if (!match) return null;

  let text = match[1].trim();
  const noteMatch = text.match(/\s*\.?\s*(Revisión narrativa de fuentes publicadas\.?\s*)$/i);
  const note = noteMatch?.[1]?.trim().replace(/\.$/, "") ?? "";
  if (noteMatch) text = text.slice(0, noteMatch.index).trim().replace(/[.;\s]+$/, "");

  const references = text.split(/\s*;\s*/).map((reference) => reference.trim().replace(/[.;\s]+$/, "")).filter(Boolean);
  return references.length ? { references, note } : null;
}

export function researchPublicSourceLabel(source: string | null | undefined) {
  if (extractResearchReferences(source)) return "";
  return source ?? "";
}

export function researchPublicBody(body: string, source: string | null | undefined) {
  const bibliography = extractResearchReferences(source);
  if (!bibliography) return body;

  const references = bibliography.references.map((reference) => `- ${reference}`).join("\n");
  const note = bibliography.note ? `\n\n${bibliography.note}.` : "";
  return `${body.trim()}\n\n## Fuentes consultadas\n\n${references}${note}`;
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

async function queryPublishedResearchItems() {
  const items = await db.content.findMany({
    where: {
      type: ContentType.RESEARCH,
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

const getCachedPublishedResearchItems = unstable_cache(
  queryPublishedResearchItems,
  ["published-research-list-v2"],
  publicContentCacheOptions()
);

export async function getPublishedResearchItems() {
  return (await getCachedPublishedResearchItems()).map(revivePublicationDates);
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

async function queryPublishedResearchBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.RESEARCH,
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

const getCachedPublishedResearchBySlug = unstable_cache(
  queryPublishedResearchBySlug,
  ["published-research-detail-v2"],
  publicContentCacheOptions()
);

export async function getPublishedResearchBySlug(slug: string) {
  const item = await getCachedPublishedResearchBySlug(slug);
  return item ? revivePublicationDates(item) : null;
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
