import { ContentStatus, ContentType, ImportState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateCaseImages, type ImageAspectRatio, type ImageProvider } from "@/lib/ai/nvidia-images";
import { resolveUniqueNewsSlug } from "@/lib/content/slugs";
import { db } from "@/lib/db";
import { emitNewsPublication } from "@/lib/realtime/clinical-case-publications";

const httpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "La fuente debe usar una URL HTTP o HTTPS válida.");

export const newsStatusSchema = z.enum([
  "ALL",
  "DRAFT",
  "PENDING_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED"
]);

export const createNewsDraftSchema = z.object({
  title: z.string().min(10),
  summary: z.string().min(40),
  body: z.string().min(120),
  sourceName: z.string().min(2),
  sourceUrl: httpUrlSchema,
  sourcePublishedAt: z.string().datetime({ offset: true }).optional(),
  tumorType: z.string().optional(),
  biomarkers: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

export const reusableNewsImageSchema = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(20).default(8)
});

export const generateNewsImageSchema = z.object({
  slug: z.string().min(1),
  prompt: z.string().min(40),
  altText: z.string().min(10),
  provider: z.enum(["openai", "nvidia", "comfyui"]).default("openai"),
  aspectRatio: z.enum(["16:9", "4:3"]).default("16:9")
});

export const publishNewsAutomatedSchema = createNewsDraftSchema.extend({
  validation: z.literal("VALIDATED").describe(
    "Declaración de la automatización de que el contenido y la fuente ya fueron validados."
  ),
  imagePrompt: z.string().min(40),
  imageAltText: z.string().min(10),
  imageProvider: z.enum(["openai", "nvidia", "comfyui"]).default("openai"),
  imageAspectRatio: z.enum(["16:9", "4:3"]).default("16:9"),
  automationRunId: z.string().min(4).max(120).optional()
});

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const newsUrls = (slug: string) => ({
  edit_url: `${siteUrl()}/panel/noticias/${slug}`,
  public_url: `${siteUrl()}/noticias/${slug}`
});

function revalidateNews(slug: string) {
  revalidatePath("/");
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${slug}`);
  revalidatePath("/panel/noticias");
  revalidatePath(`/panel/noticias/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeNewsItem(item: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  status: ContentStatus;
  source: string | null;
  sourceUrl: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date;
  tags?: unknown;
  oncologyData?: { tumorType: string | null; biomarkers: unknown } | null;
  media?: Array<{
    id: string;
    title: string;
    altText: string | null;
    storagePath: string;
    origin: string;
    isFeatured: boolean;
    isGalleryUpload?: boolean;
    galleryOrder?: number | null;
    caption?: string | null;
  }>;
}) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    ...(item.body === undefined ? {} : { body: item.body }),
    status: item.status,
    updated_at: item.updatedAt?.toISOString() ?? null,
    source_name: item.source ?? "",
    source_url: item.sourceUrl ?? "",
    published_at: item.publishedAt?.toISOString() ?? null,
    tumor_type: item.oncologyData?.tumorType ?? "",
    biomarkers: normalizeStringArray(item.oncologyData?.biomarkers),
    tags: normalizeStringArray(item.tags),
    media: (item.media ?? []).map((asset) => ({
      id: asset.id,
      title: asset.title,
      alt_text: asset.altText ?? "",
      image_url: asset.storagePath,
      origin: asset.origin,
      is_featured: asset.isFeatured,
      is_gallery_upload: asset.isGalleryUpload ?? false,
      gallery_order: asset.isGalleryUpload ? asset.galleryOrder ?? null : null,
      caption: asset.caption ?? null
    })),
    ...newsUrls(item.slug)
  };
}

export async function listRecentNews(input: {
  limit?: number;
  status?: z.input<typeof newsStatusSchema>;
}) {
  const limit = z.number().int().min(1).max(20).default(10).parse(input.limit);
  const status = newsStatusSchema.default("ALL").parse(input.status);
  const items = await db.content.findMany({
    where: {
      type: ContentType.NEWS_ITEM,
      ...(status === "ALL" ? {} : { status })
    },
    include: {
      oncologyData: true,
      media: { where: { isFeatured: true, mediaType: "image" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" },
    take: limit
  });

  return { items: items.map(normalizeNewsItem) };
}

export async function searchNews(input: {
  query: string;
  limit?: number;
  status?: z.input<typeof newsStatusSchema>;
}) {
  const query = z.string().min(2).parse(input.query).trim();
  const limit = z.number().int().min(1).max(20).default(10).parse(input.limit);
  const status = newsStatusSchema.default("ALL").parse(input.status);
  const items = await db.content.findMany({
    where: {
      type: ContentType.NEWS_ITEM,
      ...(status === "ALL" ? {} : { status }),
      OR: [
        { title: { contains: query } },
        { summary: { contains: query } },
        { body: { contains: query } },
        { source: { contains: query } },
        { slug: { contains: query } }
      ]
    },
    include: {
      oncologyData: true,
      media: { where: { isFeatured: true, mediaType: "image" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" },
    take: limit
  });

  return { items: items.map(normalizeNewsItem) };
}

export async function createNewsDraft(input: z.input<typeof createNewsDraftSchema>) {
  const data = createNewsDraftSchema.parse(input);
  const sourceUrl = data.sourceUrl.trim();
  const duplicate = await db.content.findFirst({
    where: { type: ContentType.NEWS_ITEM, sourceUrl },
    select: { slug: true, title: true }
  });
  if (duplicate) {
    throw new Error(`La fuente ya está asociada a la noticia "${duplicate.title}" (${duplicate.slug}).`);
  }

  const slug = await resolveUniqueNewsSlug(data.title);
  const created = await db.content.create({
    data: {
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.DRAFT,
      title: data.title.trim(),
      slug,
      summary: data.summary.trim(),
      body: data.body.trim(),
      source: data.sourceName.trim(),
      sourceUrl,
      author: "ChatGPT via MCP",
      tags: Array.from(new Set([...data.tags.map((tag) => tag.trim()).filter(Boolean), "mcp_chatgpt"])),
      oncologyData: {
        create: {
          tumorType: data.tumorType?.trim() || null,
          biomarkers: data.biomarkers.map((marker) => marker.trim()).filter(Boolean),
          anonymized: true
        }
      },
      importLogs: {
        create: {
          source: data.sourceName.trim(),
          payloadType: "news_item",
          payloadSummary: `Noticia recibida desde ChatGPT: ${data.title}`,
          state: ImportState.VALIDATED,
          notes: JSON.stringify({
            sourceUrl,
            sourcePublishedAt: data.sourcePublishedAt ?? null,
            channel: "chatgpt_mcp"
          })
        }
      }
    },
    include: { oncologyData: true, media: true }
  });

  revalidateNews(created.slug);
  return normalizeNewsItem(created);
}

export async function findReusableNewsImages(input: z.input<typeof reusableNewsImageSchema>) {
  const data = reusableNewsImageSchema.parse(input);
  const terms = Array.from(new Set(
    data.query
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}-]/gu, "").trim())
      .filter((term) => term.length >= 4)
  )).slice(0, 8);
  const searchTerms = terms.length ? terms : [data.query.trim()];
  const items = await db.mediaAsset.findMany({
    where: {
      mediaType: "image",
      isSensitive: false,
      isGalleryUpload: false,
      OR: searchTerms.flatMap((term) => [
        { title: { contains: term } },
        { altText: { contains: term } },
        { content: { is: { title: { contains: term } } } },
        { content: { is: { summary: { contains: term } } } }
      ])
    },
    include: { content: { select: { slug: true, title: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: data.limit
  });

  return {
    items: items.map((asset) => ({
      media_id: asset.id,
      title: asset.title,
      alt_text: asset.altText ?? "",
      image_url: asset.storagePath,
      origin: asset.origin,
      linked_content: asset.content
        ? { slug: asset.content.slug, title: asset.content.title, status: asset.content.status }
        : null
    }))
  };
}

export async function attachExistingNewsImage(input: {
  slug: string;
  mediaId: string;
  altText?: string;
}) {
  const content = await db.content.findUnique({ where: { slug: input.slug } });
  if (!content || content.type !== ContentType.NEWS_ITEM) {
    throw new Error("Noticia no encontrada.");
  }
  const sourceAsset = await db.mediaAsset.findUnique({ where: { id: input.mediaId } });
  if (!sourceAsset || sourceAsset.mediaType !== "image" || sourceAsset.isSensitive || sourceAsset.isGalleryUpload) {
    throw new Error("La imagen no existe, no es reutilizable o está marcada como sensible.");
  }

  const asset = await db.$transaction(async (tx) => {
    await tx.mediaAsset.updateMany({ where: { contentId: content.id }, data: { isFeatured: false } });
    if (sourceAsset.contentId === content.id) {
      return tx.mediaAsset.update({
        where: { id: sourceAsset.id },
        data: { isFeatured: true, altText: input.altText?.trim() || sourceAsset.altText }
      });
    }

    const alreadyAttached = await tx.mediaAsset.findFirst({
      where: { contentId: content.id, storagePath: sourceAsset.storagePath, isGalleryUpload: false }
    });
    if (alreadyAttached) {
      return tx.mediaAsset.update({
        where: { id: alreadyAttached.id },
        data: { isFeatured: true, altText: input.altText?.trim() || alreadyAttached.altText }
      });
    }

    return tx.mediaAsset.create({
      data: {
        contentId: content.id,
        title: sourceAsset.title,
        altText: input.altText?.trim() || sourceAsset.altText,
        storagePath: sourceAsset.storagePath,
        mediaType: "image",
        isSensitive: false,
        isFeatured: true,
        origin: "reused",
        prompt: sourceAsset.prompt,
        model: sourceAsset.model
      }
    });
  });

  revalidateNews(content.slug);
  return {
    slug: content.slug,
    media_id: asset.id,
    image_url: asset.storagePath,
    alt_text: asset.altText ?? "",
    origin: asset.origin,
    is_featured: asset.isFeatured
  };
}

export async function generateNewsImage(input: z.input<typeof generateNewsImageSchema>) {
  const data = generateNewsImageSchema.parse(input);
  const content = await db.content.findUnique({
    where: { slug: data.slug },
    include: { oncologyData: true }
  });
  if (!content || content.type !== ContentType.NEWS_ITEM) {
    throw new Error("Noticia no encontrada.");
  }

  const prompt = `${data.prompt.trim()} Imagen editorial médica para una noticia oncológica, sin texto incrustado, sin logotipos, sin datos personales y sin representar a un paciente real identificable.`;
  const [generated] = await generateCaseImages({
    title: content.title,
    summary: content.summary,
    body: content.body,
    tumorType: content.oncologyData?.tumorType || "oncología",
    stage: "",
    biomarkers: normalizeStringArray(content.oncologyData?.biomarkers),
    treatmentLine: "",
    treatmentPlan: "",
    evidenceLevel: "fuente periodística o científica enlazada",
    tone: "editorial médico informativo",
    aspectRatio: data.aspectRatio as ImageAspectRatio,
    promptOverride: prompt,
    provider: data.provider as ImageProvider
  });

  const asset = await db.$transaction(async (tx) => {
    await tx.mediaAsset.updateMany({ where: { contentId: content.id }, data: { isFeatured: false } });
    return tx.mediaAsset.create({
      data: {
        contentId: content.id,
        title: `Portada · ${content.title}`,
        altText: data.altText.trim(),
        storagePath: generated.url,
        mediaType: "image",
        isSensitive: false,
        isFeatured: true,
        origin: generated.origin,
        prompt: generated.prompt,
        model: generated.model
      }
    });
  });

  revalidateNews(content.slug);
  return {
    slug: content.slug,
    media_id: asset.id,
    image_url: asset.storagePath,
    alt_text: asset.altText ?? "",
    origin: asset.origin,
    model: asset.model,
    is_featured: asset.isFeatured
  };
}

export async function getNewsItem(input: { slug: string }) {
  const content = await db.content.findUnique({
    where: { slug: input.slug },
    include: {
      oncologyData: true,
      media: { orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }] }
    }
  });
  if (!content || content.type !== ContentType.NEWS_ITEM) {
    throw new Error("Noticia no encontrada.");
  }
  return normalizeNewsItem(content);
}

async function publishValidatedNews(slug: string, auditSource: string, auditNotes?: Record<string, unknown>) {
  const content = await db.content.findUnique({
    where: { slug },
    include: { oncologyData: true, media: true }
  });
  if (!content || content.type !== ContentType.NEWS_ITEM) {
    throw new Error("Noticia no encontrada.");
  }
  if (content.status === ContentStatus.ARCHIVED) {
    throw new Error("Restaura la noticia archivada desde el panel antes de publicarla.");
  }
  if (!content.source?.trim() || !content.sourceUrl?.trim()) {
    throw new Error("La noticia requiere nombre y URL de la fuente antes de publicarse.");
  }
  httpUrlSchema.parse(content.sourceUrl);
  if (!content.media.some((asset) => asset.mediaType === "image" && asset.isFeatured && !asset.isSensitive)) {
    throw new Error("Asocia o genera una imagen principal antes de publicar la noticia.");
  }
  if (content.status === ContentStatus.PUBLISHED) {
    return normalizeNewsItem(content);
  }

  const optimizedSlug = await resolveUniqueNewsSlug(content.title, content.id);
  const updated = await db.$transaction(async (tx) => {
    await tx.contentSlugAlias.deleteMany({
      where: { contentId: content.id, slug: optimizedSlug }
    });

    const published = await tx.content.update({
      where: { id: content.id },
      data: {
        slug: optimizedSlug,
        status: ContentStatus.PUBLISHED,
        publishedAt: content.publishedAt || new Date(),
        importLogs: {
          create: {
            source: auditSource,
            payloadType: "news_item",
            payloadSummary: `Publicación completada desde MCP: ${content.title}`,
            state: ImportState.VALIDATED,
            notes: JSON.stringify({
              sourceName: content.source,
              sourceUrl: content.sourceUrl,
              previousSlug: content.slug,
              optimizedSlug,
              ...auditNotes
            })
          }
        }
      },
      include: { oncologyData: true, media: true }
    });

    if (content.slug !== optimizedSlug) {
      await tx.contentSlugAlias.upsert({
        where: { slug: content.slug },
        create: { contentId: content.id, slug: content.slug },
        update: { contentId: content.id }
      });
    }

    return published;
  });

  revalidateNews(content.slug);
  revalidateNews(updated.slug);

  if (updated.publishedAt) {
    emitNewsPublication({
      slug: updated.slug,
      title: updated.title,
      summary: updated.summary,
      publishedAt: updated.publishedAt.toISOString(),
      href: `${siteUrl()}/noticias/${updated.slug}`,
      origin: {
        type: "CHATGPT_MCP",
        label: "ChatGPT · MCP",
        description: "Publicada mediante una herramienta conectada al archivo editorial"
      }
    });
  }

  return normalizeNewsItem(updated);
}

export async function publishNews(input: { slug: string; confirmation: string }) {
  if (input.confirmation !== "PUBLICAR") {
    throw new Error("La publicación requiere confirmación explícita con la palabra PUBLICAR.");
  }
  return publishValidatedNews(input.slug, "mcp:publish_news", { mode: "interactive" });
}

async function recordAutomatedFailure(slug: string, stage: string, error: unknown, automationRunId?: string) {
  const content = await db.content.findUnique({ where: { slug }, select: { id: true, title: true } });
  if (!content) return;

  await db.importLog.create({
    data: {
      source: "mcp:publish_news_automated",
      payloadType: "news_automation_failure",
      payloadSummary: `Flujo automático incompleto: ${content.title}`,
      state: ImportState.FAILED,
      contentId: content.id,
      notes: JSON.stringify({
        stage,
        automationRunId: automationRunId ?? null,
        error: error instanceof Error ? error.message : "Error desconocido"
      })
    }
  });
}

export async function publishNewsAutomated(input: z.input<typeof publishNewsAutomatedSchema>) {
  const data = publishNewsAutomatedSchema.parse(input);
  const sourceUrl = data.sourceUrl.trim();
  let existing = await db.content.findFirst({
    where: { type: ContentType.NEWS_ITEM, sourceUrl },
    include: { oncologyData: true, media: true }
  });

  if (existing?.status === ContentStatus.ARCHIVED) {
    throw new Error("La fuente corresponde a una noticia archivada y no puede republicarse automáticamente.");
  }

  let created = false;
  if (!existing) {
    const draft = await createNewsDraft({
      title: data.title,
      summary: data.summary,
      body: data.body,
      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl,
      sourcePublishedAt: data.sourcePublishedAt,
      tumorType: data.tumorType,
      biomarkers: data.biomarkers,
      tags: [...data.tags, "automated_publish"]
    });
    created = true;
    existing = await db.content.findUnique({
      where: { slug: draft.slug },
      include: { oncologyData: true, media: true }
    });
  }

  if (!existing) {
    throw new Error("No se pudo recuperar el borrador creado por la automatización.");
  }

  const hasFeaturedImage = existing.media.some(
    (asset) => asset.mediaType === "image" && asset.isFeatured && !asset.isSensitive
  );
  let imageGenerated = false;

  if (!hasFeaturedImage) {
    try {
      await generateNewsImage({
        slug: existing.slug,
        prompt: data.imagePrompt,
        altText: data.imageAltText,
        provider: data.imageProvider,
        aspectRatio: data.imageAspectRatio
      });
      imageGenerated = true;
    } catch (error) {
      await recordAutomatedFailure(
        existing.slug,
        "generate_and_attach_image",
        error,
        data.automationRunId
      ).catch(() => undefined);
      const draft = await getNewsItem({ slug: existing.slug });
      return {
        completed: false,
        retryable: true,
        stage: "IMAGE_GENERATION_FAILED",
        created,
        image_generated: false,
        published: false,
        error: error instanceof Error ? error.message : "No se pudo generar la imagen.",
        item: draft
      };
    }
  }

  try {
    const published = await publishValidatedNews(
      existing.slug,
      "mcp:publish_news_automated",
      {
        mode: "automated",
        validation: data.validation,
        automationRunId: data.automationRunId ?? null,
        created,
        imageGenerated
      }
    );
    return {
      completed: true,
      retryable: false,
      stage: "PUBLISHED",
      created,
      image_generated: imageGenerated,
      published: true,
      error: null,
      item: published
    };
  } catch (error) {
    await recordAutomatedFailure(
      existing.slug,
      "publish",
      error,
      data.automationRunId
    ).catch(() => undefined);
    const draft = await getNewsItem({ slug: existing.slug });
    return {
      completed: false,
      retryable: true,
      stage: "PUBLISH_FAILED",
      created,
      image_generated: imageGenerated,
      published: false,
      error: error instanceof Error ? error.message : "No se pudo publicar la noticia.",
      item: draft
    };
  }
}
