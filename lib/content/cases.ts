import { ContentStatus, ContentType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getEditorialQualityReview } from "@/lib/ai/visual-pipeline/presentation";
import {
  publicContentCacheOptions,
  revivePublicationDates
} from "@/lib/content/public-cache";
import { buildPublicListingWhere, type PublicListingFilters } from "@/lib/content/public-listing";

type JsonArray = string[] | null;

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export function splitCommaSeparated(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function getClinicalCases() {
  const cases = await db.content.findMany({
    where: {
      type: ContentType.CLINICAL_CASE
    },
    include: {
      oncologyData: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return cases.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    status: item.status,
    summary: item.summary,
    updatedAt: item.updatedAt,
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    stage: item.oncologyData?.stage ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers as JsonArray),
    treatmentLine: item.oncologyData?.treatmentLine ?? ""
  }));
}

async function queryPublishedClinicalCases(limit?: number, offset = 0, filters: PublicListingFilters = {}) {
  const cases = await db.content.findMany({
    where: buildPublicListingWhere(ContentType.CLINICAL_CASE, filters),
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      oncologyData: {
        select: {
          tumorType: true,
          stage: true,
          biomarkers: true
        }
      },
      media: {
        where: {
          mediaType: "image",
          isFeatured: true
        },
        select: {
          storagePath: true,
          altText: true,
          title: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    skip: offset
  });

  return cases.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    stage: item.oncologyData?.stage ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers as JsonArray),
    featuredImage: item.media[0]
      ? {
          src: item.media[0].storagePath,
          alt: item.media[0].altText || item.media[0].title || item.title
        }
      : null,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  }));
}

const getCachedPublishedClinicalCases = unstable_cache(
  queryPublishedClinicalCases,
  ["published-clinical-cases-list-v3"],
  publicContentCacheOptions()
);

export async function getPublishedClinicalCases(options: { limit?: number } = {}) {
  return (await getCachedPublishedClinicalCases(options.limit)).map(revivePublicationDates);
}

export async function getPublishedClinicalCasesPage(
  filters: PublicListingFilters,
  page: number,
  pageSize: number
) {
  const where = buildPublicListingWhere(ContentType.CLINICAL_CASE, filters);
  const total = await db.content.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const items = await getCachedPublishedClinicalCases(pageSize, (currentPage - 1) * pageSize, filters);
  return {
    items: items.map(revivePublicationDates),
    total,
    page: currentPage,
    pageCount
  };
}

export async function getClinicalCaseBySlug(slug: string) {
  const item = await db.content.findUnique({
    where: { slug },
    include: {
      oncologyData: true,
      media: {
        where: { mediaType: "image", isGalleryUpload: false },
        orderBy: { createdAt: "desc" }
      },
      visualPlans: {
        where: { isCurrent: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          figures: { orderBy: { figureNumber: "asc" } }
        }
      }
    }
  });

  if (!item || item.type !== ContentType.CLINICAL_CASE) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    status: item.status,
    summary: item.summary,
    body: item.body,
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    stage: item.oncologyData?.stage ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers as JsonArray),
    treatmentLine: item.oncologyData?.treatmentLine ?? "",
    treatmentPlan: item.oncologyData?.treatmentPlan ?? "",
    response: item.oncologyData?.response ?? "",
    toxicities: toArray(item.oncologyData?.toxicities as JsonArray),
    evidenceLevel: item.oncologyData?.evidenceLevel ?? "",
    reviewNotes: item.oncologyData?.reviewNotes ?? "",
    anonymized: item.oncologyData?.anonymized ?? false,
    mediaAssets: item.media.map((asset) => ({
      id: asset.id,
      title: asset.title,
      altText: asset.altText,
      storagePath: asset.storagePath,
      isFeatured: asset.isFeatured,
      prompt: asset.prompt,
      origin: asset.origin,
      figureId: asset.figureId
    })),
    visualPlan: item.visualPlans[0]
      ? {
          id: item.visualPlans[0].id,
          status: item.visualPlans[0].status,
          currentStage: item.visualPlans[0].currentStage,
          qualityScore: item.visualPlans[0].qualityScore,
          error: item.visualPlans[0].error,
          qualityReview: getEditorialQualityReview(item.visualPlans[0].sharedState),
          figures: item.visualPlans[0].figures.map((figure) => ({
            id: figure.id,
            figureNumber: figure.figureNumber,
            priority: figure.priority,
            title: figure.title,
            category: figure.category,
            purpose: figure.purpose,
            educationalMessage: figure.educationalMessage,
            reason: figure.reason,
            score: figure.adjustedScore,
            optimizedPrompt: figure.optimizedPrompt,
            status: figure.status,
            isFeatured: figure.isFeatured
          }))
        }
      : null
  };
}

async function queryPublishedClinicalCaseBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.CLINICAL_CASE,
      status: ContentStatus.PUBLISHED
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      body: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      oncologyData: {
        select: {
          tumorType: true,
          stage: true,
          biomarkers: true,
          treatmentLine: true,
          treatmentPlan: true,
          response: true
        }
      },
      media: {
        where: { isFeatured: true, mediaType: "image" },
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
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    body: item.body,
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    stage: item.oncologyData?.stage ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers as JsonArray),
    treatmentLine: item.oncologyData?.treatmentLine ?? "",
    treatmentPlan: item.oncologyData?.treatmentPlan ?? "",
    response: item.oncologyData?.response ?? "",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    featuredImage: item.media[0]
      ? {
          src: item.media[0].storagePath,
          alt: item.media[0].altText || item.media[0].title,
          origin: item.media[0].origin
        }
      : null
  };
}

const getCachedPublishedClinicalCaseBySlug = unstable_cache(
  queryPublishedClinicalCaseBySlug,
  ["published-clinical-case-detail-v2"],
  publicContentCacheOptions()
);

export async function getPublishedClinicalCaseBySlug(slug: string) {
  const item = await getCachedPublishedClinicalCaseBySlug(slug);
  return item ? revivePublicationDates(item) : null;
}

export async function getClinicalCaseStats() {
  const [totalCases, pendingReview, publishedCases] = await Promise.all([
    db.content.count({
      where: { type: ContentType.CLINICAL_CASE }
    }),
    db.content.count({
      where: {
        type: ContentType.CLINICAL_CASE,
        status: ContentStatus.PENDING_REVIEW
      }
    }),
    db.content.count({
      where: {
        type: ContentType.CLINICAL_CASE,
        status: ContentStatus.PUBLISHED
      }
    })
  ]);

  return {
    totalCases,
    pendingReview,
    publishedCases
  };
}
