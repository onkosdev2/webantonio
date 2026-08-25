"use server";

import { ContentStatus, ContentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
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

async function generateEditorialDraft(
  payload: ReturnType<typeof buildPayload>,
  aiTone: string
) {
  return generateDraftWithGlm({
    kind: "editorial",
    focus: payload.tags[0] || "oncologia",
    topic: payload.title,
    angle: payload.summary || "editorial",
    goal: "desarrollar una editorial publicable",
    tone: aiTone || "sobrio",
    length: "amplia",
    notes: payload.body
  });
}

function revalidateEditorialPaths(previousSlug: string, nextSlug: string) {
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/editoriales");
  revalidatePath(`/panel/editoriales/${previousSlug}`);
  revalidatePath(`/panel/editoriales/${nextSlug}`);
  revalidatePath("/editoriales");
  revalidatePath(`/editoriales/${previousSlug}`);
  revalidatePath(`/editoriales/${nextSlug}`);
}

export async function createEditorialAction(formData: FormData) {
  await requireAdminSession();

  const payload = buildPayload(formData);
  let created;
  const intent = getFormText(formData, "intent");
  const aiTone = getFormText(formData, "aiTone") || "sobrio";
  const generated =
    intent === "ai_generate" ? await generateEditorialDraft(payload, aiTone) : null;
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
          type: ContentType.EDITORIAL,
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
    throw new Error("No se pudo crear la editorial con un slug unico.");
  }

  revalidateEditorialPaths(created.slug, created.slug);
  redirect(`/panel/editoriales/${created.slug}`);
}

export async function updateEditorialAction(slug: string, formData: FormData) {
  await requireAdminSession();

  const payload = buildPayload(formData);
  const current = await db.content.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true, tags: true }
  });

  if (!current) {
    throw new Error("La editorial que intentas actualizar ya no existe.");
  }

  const aiOperation = getAiOperation(formData);

  if (aiOperation) {
    const refined = await refineDraftWithGlm({
      kind: "editorial",
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

    revalidateEditorialPaths(slug, updatedWithAi.slug);
    redirect(`/panel/editoriales/${updatedWithAi.slug}`);
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
    throw new Error("No se pudo guardar la editorial con un slug unico.");
  }

  revalidateEditorialPaths(slug, updated.slug);
  redirect(`/panel/editoriales/${updated.slug}`);
}
