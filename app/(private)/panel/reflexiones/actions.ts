"use server";

import { ContentStatus, ContentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateDraftWithGlm, refineDraftWithGlm } from "@/lib/ai/glm";
import { slugify, splitCommaSeparated } from "@/lib/content/cases";
import {
  getFormText,
  resolveEditorialStatus,
  resolvePublicationFields
} from "@/lib/content/publication";
import {
  isUniqueConstraintError,
  resolveUniqueContentSlug
} from "@/lib/content/slugs";

function buildPayload(formData: FormData) {
  const title = getFormText(formData, "title");
  const slugInput = getFormText(formData, "slug");

  return {
    title,
    slug: slugify(slugInput || title),
    source: getFormText(formData, "source"),
    summary: getFormText(formData, "summary"),
    body: getFormText(formData, "body"),
    tags: splitCommaSeparated(getFormText(formData, "tags")),
    status: resolveEditorialStatus(formData)
  };
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

async function generateReflectionDraft(payload: ReturnType<typeof buildPayload>, aiTone: string) {
  return generateDraftWithGlm({
    kind: "reflection",
    focus: payload.tags[0] || "oncologia",
    topic: payload.title,
    angle: payload.summary || "reflexivo",
    goal: "desarrollar una reflexión breve publicable",
    tone: aiTone || "sobrio",
    length: "media",
    notes: payload.body
  });
}

function revalidateReflectionPaths(previousSlug: string, nextSlug: string) {
  revalidatePath("/panel");
  revalidatePath("/panel/reflexiones");
  revalidatePath(`/panel/reflexiones/${previousSlug}`);
  revalidatePath(`/panel/reflexiones/${nextSlug}`);
  revalidatePath("/reflexiones");
  revalidatePath(`/reflexiones/${previousSlug}`);
  revalidatePath(`/reflexiones/${nextSlug}`);
}

export async function createReflectionAction(formData: FormData) {
  const payload = buildPayload(formData);
  let created;
  const intent = getFormText(formData, "intent");
  const aiTone = getFormText(formData, "aiTone") || "sobrio";
  const generated =
    intent === "ai_generate" ? await generateReflectionDraft(payload, aiTone) : null;
  const publication = resolvePublicationFields(
    intent === "ai_generate" ? ContentStatus.DRAFT : payload.status
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const uniqueSlug =
      attempt === 0
        ? await resolveUniqueContentSlug(payload.slug)
        : await resolveUniqueContentSlug(`${payload.slug}-${attempt + 1}`);

    try {
      created = await db.content.create({
        data: {
          type: ContentType.REFLECTION,
          status: publication.status,
          publishedAt: publication.publishedAt,
          title: generated?.title ?? payload.title,
          slug: uniqueSlug,
          summary: generated?.summary ?? payload.summary,
          body: generated?.body ?? payload.body,
          source: payload.source,
          author: "Dr. Antonio Camargo",
          tags: generated
            ? Array.from(
                new Set([
                  ...payload.tags,
                  generated.generationMode === "glm" ? "ai_glm" : "ai_fallback"
                ])
              )
            : payload.tags
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
    throw new Error("No se pudo crear la reflexión con un slug unico.");
  }

  revalidateReflectionPaths(created.slug, created.slug);
  redirect(`/panel/reflexiones/${created.slug}`);
}

export async function updateReflectionAction(slug: string, formData: FormData) {
  const payload = buildPayload(formData);
  const current = await db.content.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true, tags: true }
  });

  if (!current) {
    throw new Error("La reflexión que intentas actualizar ya no existe.");
  }

  const aiOperation = getAiOperation(formData);

  if (aiOperation) {
    const refined = await refineDraftWithGlm({
      kind: "reflection",
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

    revalidateReflectionPaths(slug, updatedWithAi.slug);
    redirect(`/panel/reflexiones/${updatedWithAi.slug}`);
  }

  let updated;
  const publication = resolvePublicationFields(payload.status, current.publishedAt);

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
          status: publication.status,
          publishedAt: publication.publishedAt,
          title: payload.title,
          summary: payload.summary,
          body: payload.body,
          source: payload.source,
          tags: payload.tags
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
    throw new Error("No se pudo guardar la reflexión con un slug unico.");
  }

  revalidateReflectionPaths(slug, updated.slug);
  redirect(`/panel/reflexiones/${updated.slug}`);
}
