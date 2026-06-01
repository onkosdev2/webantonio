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

async function generateResearchDraft(
  payload: ReturnType<typeof buildPayload>,
  aiTone: string
) {
  return generateDraftWithGlm({
    kind: "research",
    focus: payload.tags[0] || "oncologia",
    topic: payload.title,
    angle: payload.summary || "investigacion",
    goal: "desarrollar una investigacion publicable",
    tone: aiTone || "sobrio",
    length: "amplia",
    notes: payload.body
  });
}

function revalidateResearchPaths(previousSlug: string, nextSlug: string) {
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/investigacion");
  revalidatePath(`/panel/investigacion/${previousSlug}`);
  revalidatePath(`/panel/investigacion/${nextSlug}`);
  revalidatePath("/investigacion");
  revalidatePath(`/investigacion/${previousSlug}`);
  revalidatePath(`/investigacion/${nextSlug}`);
}

export async function createResearchAction(formData: FormData) {
  const payload = buildPayload(formData);
  let created;
  const intent = getFormText(formData, "intent");
  const aiTone = getFormText(formData, "aiTone") || "sobrio";
  const generated =
    intent === "ai_generate" ? await generateResearchDraft(payload, aiTone) : null;
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
          type: ContentType.RESEARCH,
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
    throw new Error("No se pudo crear la pieza de investigacion con un slug unico.");
  }

  revalidateResearchPaths(created.slug, created.slug);
  redirect(`/panel/investigacion/${created.slug}`);
}

export async function updateResearchAction(slug: string, formData: FormData) {
  const payload = buildPayload(formData);
  const current = await db.content.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true, tags: true }
  });

  if (!current) {
    throw new Error("La pieza de investigacion que intentas actualizar ya no existe.");
  }

  const aiOperation = getAiOperation(formData);

  if (aiOperation) {
    const refined = await refineDraftWithGlm({
      kind: "research",
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

    revalidateResearchPaths(slug, updatedWithAi.slug);
    redirect(`/panel/investigacion/${updatedWithAi.slug}`);
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
    throw new Error("No se pudo guardar la pieza de investigacion con un slug unico.");
  }

  revalidateResearchPaths(slug, updated.slug);
  redirect(`/panel/investigacion/${updated.slug}`);
}
