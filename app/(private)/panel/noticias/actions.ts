"use server";

import { ContentStatus, ContentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateDraftWithGlm, refineDraftWithGlm } from "@/lib/ai/glm";
import { ingestOncologyNews } from "@/lib/news/ingest";
import { splitCommaSeparated } from "@/lib/content/cases";
import { buildSeoNewsSlug } from "@/lib/content/news-seo";
import {
  getFormText,
  resolveEditorialStatus,
  resolvePublicationFields
} from "@/lib/content/publication";
import {
  isUniqueConstraintError,
  resolveUniqueNewsSlug
} from "@/lib/content/slugs";
import { emitNewsPublication } from "@/lib/realtime/clinical-case-publications";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

function buildPayload(formData: FormData) {
  const title = getFormText(formData, "title");
  const slugInput = getFormText(formData, "slug");

  return {
    title,
    slug: buildSeoNewsSlug(slugInput || title),
    source: getFormText(formData, "source"),
    sourceUrl: getFormText(formData, "sourceUrl"),
    summary: getFormText(formData, "summary"),
    body: getFormText(formData, "body"),
    tumorType: getFormText(formData, "tumorType"),
    biomarkers: splitCommaSeparated(getFormText(formData, "biomarkers")),
    tags: splitCommaSeparated(getFormText(formData, "tags")),
    status: resolveEditorialStatus(formData, ContentStatus.PENDING_REVIEW)
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

function assertValidNewsSource(payload: ReturnType<typeof buildPayload>) {
  if (!payload.source.trim()) {
    throw new Error("El nombre de la fuente es obligatorio para crear una noticia.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(payload.sourceUrl);
  } catch {
    throw new Error("La URL de la fuente es obligatoria y debe ser válida.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("La URL de la fuente debe comenzar con http:// o https://.");
  }
}

async function generateNewsDraft(payload: ReturnType<typeof buildPayload>, aiTone: string) {
  return generateDraftWithGlm({
    kind: "news_item",
    focus: payload.tumorType || payload.tags[0] || "oncologia",
    topic: payload.title,
    angle: payload.summary || "comentario clínico",
    goal: "desarrollar una noticia comentada publicable",
    tone: aiTone || "sobrio",
    length: "media",
    notes: [
      payload.body,
      payload.source ? `Fuente base: ${payload.source}` : "",
      payload.sourceUrl ? `Enlace original: ${payload.sourceUrl}` : ""
    ]
      .filter(Boolean)
      .join("\n\n")
  });
}

function revalidateNewsPaths(previousSlug: string, nextSlug: string) {
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/noticias");
  revalidatePath(`/panel/noticias/${previousSlug}`);
  revalidatePath(`/panel/noticias/${nextSlug}`);
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${previousSlug}`);
  revalidatePath(`/noticias/${nextSlug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
}

export async function createNewsItemAction(formData: FormData) {
  const user = await requireAdminSession();

  const payload = buildPayload(formData);
  assertValidNewsSource(payload);
  let created;
  const intent = getFormText(formData, "intent");
  const aiTone = getFormText(formData, "aiTone") || "sobrio";
  const generated = intent === "ai_generate" ? await generateNewsDraft(payload, aiTone) : null;
  const publication = resolvePublicationFields(
    intent === "ai_generate" ? ContentStatus.DRAFT : payload.status
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const uniqueSlug =
      attempt === 0
        ? await resolveUniqueNewsSlug(payload.slug)
        : await resolveUniqueNewsSlug(`${payload.slug}-${attempt + 1}`);

    try {
      created = await db.content.create({
        data: {
          type: ContentType.NEWS_ITEM,
          status: publication.status,
          publishedAt: publication.publishedAt,
          title: generated?.title ?? payload.title,
          slug: uniqueSlug,
          summary: generated?.summary ?? payload.summary,
          body: generated?.body ?? payload.body,
          source: payload.source,
          sourceUrl: payload.sourceUrl || null,
          author: "Dr. Antonio Camargo",
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
              biomarkers: payload.biomarkers,
              anonymized: true
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
    throw new Error("No se pudo crear la noticia con un slug unico.");
  }

  revalidateNewsPaths(created.slug, created.slug);

  if (created.status === ContentStatus.PUBLISHED && created.publishedAt) {
    emitNewsPublication({
      slug: created.slug,
      title: created.title,
      summary: created.summary,
      publishedAt: created.publishedAt.toISOString(),
      href: `${siteUrl()}/noticias/${created.slug}`,
      origin: {
        type: "PANEL_USER",
        label: "Equipo editorial",
        description: `Publicado por ${user.name} desde el panel de ONKOS`
      }
    });
  }

  redirect(`/panel/noticias/${created.slug}`);
}

export async function updateNewsItemAction(slug: string, formData: FormData) {
  const user = await requireAdminSession();

  const payload = buildPayload(formData);
  assertValidNewsSource(payload);
  const current = await db.content.findUnique({
    where: { slug },
    select: { id: true, status: true, publishedAt: true, tags: true }
  });

  if (!current) {
    throw new Error("La noticia que intentas actualizar ya no existe.");
  }

  const aiOperation = getAiOperation(formData);

  if (aiOperation) {
    const refined = await refineDraftWithGlm({
      kind: "news_item",
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

    revalidateNewsPaths(slug, updatedWithAi.slug);
    redirect(`/panel/noticias/${updatedWithAi.slug}`);
  }

  let updated;
  const publication = resolvePublicationFields(payload.status, current.publishedAt);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const uniqueSlug =
      attempt === 0
        ? await resolveUniqueNewsSlug(payload.slug, current.id)
        : await resolveUniqueNewsSlug(
            `${payload.slug}-${attempt + 1}`,
            current.id
          );

    try {
      updated = await db.$transaction(async (tx) => {
        await tx.contentSlugAlias.deleteMany({
          where: { contentId: current.id, slug: uniqueSlug }
        });

        const saved = await tx.content.update({
          where: { slug },
          data: {
            slug: uniqueSlug,
            status: publication.status,
            publishedAt: publication.publishedAt,
            title: payload.title,
            summary: payload.summary,
            body: payload.body,
            source: payload.source,
            sourceUrl: payload.sourceUrl || null,
            tags: payload.tags,
            oncologyData: {
              upsert: {
                create: {
                  tumorType: payload.tumorType,
                  biomarkers: payload.biomarkers,
                  anonymized: true
                },
                update: {
                  tumorType: payload.tumorType,
                  biomarkers: payload.biomarkers
                }
              }
            }
          }
        });

        if (slug !== uniqueSlug) {
          await tx.contentSlugAlias.upsert({
            where: { slug },
            create: { contentId: current.id, slug },
            update: { contentId: current.id }
          });
        }

        return saved;
      });
      break;
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 4) {
        throw error;
      }
    }
  }

  if (!updated) {
    throw new Error("No se pudo guardar la noticia con un slug unico.");
  }

  revalidateNewsPaths(slug, updated.slug);

  if (current.status !== ContentStatus.PUBLISHED && updated.status === ContentStatus.PUBLISHED && updated.publishedAt) {
    emitNewsPublication({
      slug: updated.slug,
      title: updated.title,
      summary: updated.summary,
      publishedAt: updated.publishedAt.toISOString(),
      href: `${siteUrl()}/noticias/${updated.slug}`,
      origin: {
        type: "PANEL_USER",
        label: "Equipo editorial",
        description: `Publicado por ${user.name} desde el panel de ONKOS`
      }
    });
  }

  redirect(`/panel/noticias/${updated.slug}`);
}

export async function runNewsIngestionAction() {
  await requireAdminSession();

  await ingestOncologyNews();
  revalidatePath("/panel");
  revalidatePath("/panel/noticias");
}
