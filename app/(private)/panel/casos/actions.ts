"use server";

import { ContentStatus, ContentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateDraftWithGlm, refineDraftWithGlm } from "@/lib/ai/glm";
import { slugify, splitCommaSeparated } from "@/lib/content/cases";
import {
  getFormText,
  parseContentStatus,
  resolvePublicationFields
} from "@/lib/content/publication";
import {
  isUniqueConstraintError,
  resolveUniqueContentSlug
} from "@/lib/content/slugs";

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function buildPayload(formData: FormData) {
  const title = getFormText(formData, "title");
  const slugInput = getFormText(formData, "slug");
  const slug = slugify(slugInput || title);

  return {
    title,
    slug,
    summary: getFormText(formData, "summary"),
    body: getFormText(formData, "body"),
    status: parseContentStatus(formData.get("status")),
    tags: splitCommaSeparated(getFormText(formData, "tags")),
    tumorType: getFormText(formData, "tumorType"),
    stage: getFormText(formData, "stage"),
    biomarkers: splitCommaSeparated(getFormText(formData, "biomarkers")),
    treatmentLine: getFormText(formData, "treatmentLine"),
    treatmentPlan: getFormText(formData, "treatmentPlan"),
    response: getFormText(formData, "response"),
    toxicities: splitCommaSeparated(getFormText(formData, "toxicities")),
    evidenceLevel: getFormText(formData, "evidenceLevel"),
    reviewNotes: getFormText(formData, "reviewNotes"),
    anonymized: getBoolean(formData, "anonymized")
  };
}

function resolveClinicalCaseStatus(formData: FormData) {
  const intent = getFormText(formData, "intent");

  if (intent === "save_draft") {
    return ContentStatus.DRAFT;
  }

  if (intent === "send_review") {
    return ContentStatus.PENDING_REVIEW;
  }

  if (intent === "publish") {
    return ContentStatus.PUBLISHED;
  }

  if (intent === "archive") {
    return ContentStatus.ARCHIVED;
  }

  return parseContentStatus(formData.get("status"));
}

function getAiOperation(formData: FormData) {
  const intent = getFormText(formData, "intent");

  if (
    intent === "ai_regenerate" ||
    intent === "ai_expand" ||
    intent === "ai_shorten" ||
    intent === "ai_retone"
  ) {
    return intent;
  }

  return null;
}

async function generateClinicalCaseDraft(
  payload: ReturnType<typeof buildPayload>,
  aiTone: string
) {
  const metadataNotes = [
    payload.stage ? `Estadio: ${payload.stage}` : "",
    payload.biomarkers.length ? `Biomarcadores: ${payload.biomarkers.join(", ")}` : "",
    payload.treatmentLine ? `Línea terapéutica: ${payload.treatmentLine}` : "",
    payload.treatmentPlan ? `Plan: ${payload.treatmentPlan}` : "",
    payload.response ? `Respuesta: ${payload.response}` : "",
    payload.toxicities.length ? `Toxicidades: ${payload.toxicities.join(", ")}` : "",
    payload.evidenceLevel ? `Evidencia: ${payload.evidenceLevel}` : "",
    payload.reviewNotes ? `Notas: ${payload.reviewNotes}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return generateDraftWithGlm({
    kind: "clinical_case",
    focus: payload.tumorType || "oncologia",
    topic: payload.title,
    angle: payload.summary || "docente",
    goal: "desarrollar un caso clínico publicable y estructurado",
    tone: aiTone || "docente",
    length: "amplia",
    notes: [payload.body, metadataNotes].filter(Boolean).join("\n\n")
  });
}

function revalidateClinicalCasePaths(previousSlug: string, nextSlug: string) {
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/casos");
  revalidatePath(`/panel/casos/${previousSlug}`);
  revalidatePath(`/panel/casos/${nextSlug}`);
  revalidatePath("/casos-clinicos");
  revalidatePath(`/casos-clinicos/${previousSlug}`);
  revalidatePath(`/casos-clinicos/${nextSlug}`);
}

export async function createClinicalCaseAction(formData: FormData) {
  const payload = buildPayload(formData);
  let created;
  const aiIntent = getFormText(formData, "intent");
  const aiTone = getFormText(formData, "aiTone") || "docente";
  const generated =
    aiIntent === "ai_generate"
      ? await generateClinicalCaseDraft(payload, aiTone)
      : null;
  const nextStatus =
    aiIntent === "ai_generate" ? ContentStatus.DRAFT : resolveClinicalCaseStatus(formData);

  if (nextStatus === ContentStatus.PUBLISHED && !payload.anonymized) {
    throw new Error("No puedes publicar un caso clínico sin confirmar su anonimización.");
  }

  const publication = resolvePublicationFields(nextStatus);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const uniqueSlug =
      attempt === 0
        ? await resolveUniqueContentSlug(payload.slug)
        : await resolveUniqueContentSlug(`${payload.slug}-${attempt + 1}`);

    try {
      created = await db.content.create({
        data: {
          type: ContentType.CLINICAL_CASE,
          status: publication.status,
          publishedAt: publication.publishedAt,
          title: generated?.title ?? payload.title,
          slug: uniqueSlug,
          summary: generated?.summary ?? payload.summary,
          body: generated?.body ?? payload.body,
          author: "Dr. Antonio Camargo",
          source: "panel_privado",
          tags: generated
            ? Array.from(
                new Set([
                  ...payload.tags,
                  generated.generationMode === "glm" ? "ai_glm" : "ai_fallback"
                ])
              )
            : payload.tags,
          oncologyData: {
            create: {
              tumorType: payload.tumorType,
              stage: payload.stage,
              biomarkers: payload.biomarkers,
              treatmentLine: payload.treatmentLine,
              treatmentPlan: payload.treatmentPlan,
              response: payload.response,
              toxicities: payload.toxicities,
              evidenceLevel: payload.evidenceLevel,
              reviewNotes: payload.reviewNotes,
              anonymized: payload.anonymized
            }
          }
        }
      });
      break;
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 4) {
        throw error;
      }
    }
  }

  if (!created) {
    throw new Error("No se pudo crear el caso clinico con un slug unico.");
  }

  revalidateClinicalCasePaths(created.slug, created.slug);
  redirect(`/panel/casos/${created.slug}`);
}

export async function updateClinicalCaseAction(
  slug: string,
  formData: FormData
) {
  const payload = buildPayload(formData);
  const current = await db.content.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true, tags: true }
  });

  if (!current) {
    throw new Error("El caso clinico que intentas actualizar ya no existe.");
  }

  const aiOperation = getAiOperation(formData);

  if (aiOperation) {
    const refined = await refineDraftWithGlm({
      kind: "clinical_case",
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      operation:
        aiOperation === "ai_regenerate"
          ? "regenerate"
          : aiOperation === "ai_expand"
            ? "expand"
            : aiOperation === "ai_shorten"
              ? "shorten"
              : "retone",
      targetTone: getFormText(formData, "aiTone") || undefined
    });

    const existingTags = Array.isArray(current.tags)
      ? current.tags.filter((item): item is string => typeof item === "string")
      : [];
    const nextTags = Array.from(
      new Set([
        ...existingTags,
        refined.generationMode === "glm" ? "ai_glm" : "ai_fallback"
      ])
    );

    const updatedWithAi = await db.content.update({
      where: { slug },
      data: {
        title: refined.title,
        summary: refined.summary,
        body: refined.body,
        tags: nextTags
      }
    });

    revalidateClinicalCasePaths(slug, updatedWithAi.slug);
    redirect(`/panel/casos/${updatedWithAi.slug}`);
  }

  let updated;
  const nextStatus = resolveClinicalCaseStatus(formData);

  if (nextStatus === ContentStatus.PUBLISHED && !payload.anonymized) {
    throw new Error("No puedes publicar un caso clínico sin confirmar su anonimización.");
  }

  const publication = resolvePublicationFields(nextStatus, current.publishedAt);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const uniqueSlug =
      attempt === 0
        ? await resolveUniqueContentSlug(payload.slug, current.id)
        : await resolveUniqueContentSlug(
            `${payload.slug}-${attempt + 1}`,
            current.id
          );

    try {
      updated = await db.content.update({
        where: { slug },
        data: {
          slug: uniqueSlug,
          title: payload.title,
          summary: payload.summary,
          body: payload.body,
          status: publication.status,
          publishedAt: publication.publishedAt,
          tags: payload.tags,
          oncologyData: {
            upsert: {
              create: {
                tumorType: payload.tumorType,
                stage: payload.stage,
                biomarkers: payload.biomarkers,
                treatmentLine: payload.treatmentLine,
                treatmentPlan: payload.treatmentPlan,
                response: payload.response,
                toxicities: payload.toxicities,
                evidenceLevel: payload.evidenceLevel,
                reviewNotes: payload.reviewNotes,
                anonymized: payload.anonymized
              },
              update: {
                tumorType: payload.tumorType,
                stage: payload.stage,
                biomarkers: payload.biomarkers,
                treatmentLine: payload.treatmentLine,
                treatmentPlan: payload.treatmentPlan,
                response: payload.response,
                toxicities: payload.toxicities,
                evidenceLevel: payload.evidenceLevel,
                reviewNotes: payload.reviewNotes,
                anonymized: payload.anonymized
              }
            }
          }
        }
      });
      break;
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 4) {
        throw error;
      }
    }
  }

  if (!updated) {
    throw new Error("No se pudo guardar el caso clinico con un slug unico.");
  }

  revalidateClinicalCasePaths(slug, updated.slug);
  redirect(`/panel/casos/${updated.slug}`);
}
