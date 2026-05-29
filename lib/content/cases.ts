import { ContentStatus, ContentType } from "@prisma/client";
import { db } from "@/lib/db";

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

export async function getPublishedClinicalCases() {
  const cases = await db.content.findMany({
    where: {
      type: ContentType.CLINICAL_CASE,
      status: ContentStatus.PUBLISHED
    },
    include: {
      oncologyData: true
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }]
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
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  }));
}

export async function getClinicalCaseBySlug(slug: string) {
  const item = await db.content.findUnique({
    where: { slug },
    include: {
      oncologyData: true
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
    anonymized: item.oncologyData?.anonymized ?? false
  };
}

export async function getPublishedClinicalCaseBySlug(slug: string) {
  const item = await db.content.findFirst({
    where: {
      slug,
      type: ContentType.CLINICAL_CASE,
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
    tags: toArray(item.tags),
    tumorType: item.oncologyData?.tumorType ?? "",
    stage: item.oncologyData?.stage ?? "",
    biomarkers: toArray(item.oncologyData?.biomarkers as JsonArray),
    treatmentLine: item.oncologyData?.treatmentLine ?? "",
    treatmentPlan: item.oncologyData?.treatmentPlan ?? "",
    response: item.oncologyData?.response ?? "",
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt
  };
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
