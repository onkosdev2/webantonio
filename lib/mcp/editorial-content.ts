import { ContentStatus, ContentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePublicContentCache } from "@/lib/content/public-cache";
import { isUniqueConstraintError, resolveUniqueContentSlug } from "@/lib/content/slugs";
import { resolvePublicationImage, storePublicationImage } from "@/lib/storage/publication-images";
import { downloadPublicationAttachment, publicationAttachmentSchema } from "@/lib/storage/publication-attachments";
import type { PublicationImagesOptions } from "@/lib/content/services/publication-images";

export const editorialContentTypeSchema = z.enum(["editorial", "research", "reflection"]);
const typeMap = { editorial: ContentType.EDITORIAL, research: ContentType.RESEARCH, reflection: ContentType.REFLECTION } as const;
const typePath = { editorial: "editoriales", research: "investigacion", reflection: "reflexiones" } as const;
const tagsSchema = z.array(z.string().trim().min(1).max(80)).max(50);

export const listEditorialContentSchema = z.object({
  type: editorialContentTypeSchema,
  status: z.enum(["ALL", "DRAFT", "PENDING_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("ALL"),
  query: z.string().trim().max(200).default(""),
  limit: z.number().int().min(1).max(50).default(10)
}).strict();

export const createEditorialContentSchema = z.object({
  type: editorialContentTypeSchema,
  title: z.string().trim().min(5).max(250),
  summary: z.string().trim().min(20).max(3000),
  body: z.string().trim().min(50).max(100_000),
  source: z.string().trim().max(500).optional(),
  tags: tagsSchema.default([]),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).default("DRAFT"),
  files: z.array(publicationAttachmentSchema).length(1).optional().describe("Para una reflexión, adjunta exactamente una imagen mediante files."),
  imageTitle: z.string().trim().min(3).max(250).optional(),
  imageAltText: z.string().trim().min(10).max(1000).optional(),
  imageCaption: z.string().trim().max(2000).optional()
}).strict();

export const setReflectionImageSchema = z.object({
  slug: z.string().trim().min(1),
  files: z.array(publicationAttachmentSchema).length(1).describe("Adjunta exactamente una imagen con files."),
  imageTitle: z.string().trim().min(3).max(250),
  imageAltText: z.string().trim().min(10).max(1000),
  imageCaption: z.string().trim().max(2000).optional(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  confirmation: z.literal("ACTUALIZAR_PUBLICADO").optional()
}).strict();

export const updateEditorialContentSchema = z.object({
  type: editorialContentTypeSchema,
  slug: z.string().trim().min(1),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  confirmation: z.literal("ACTUALIZAR_PUBLICADO").optional(),
  changes: z.object({
    title: z.string().trim().min(5).max(250).optional(),
    summary: z.string().trim().min(20).max(3000).optional(),
    body: z.string().trim().min(50).max(100_000).optional(),
    source: z.string().trim().max(500).nullable().optional(),
    tags: tagsSchema.optional()
  }).strict().refine((value) => Object.keys(value).length > 0, "Indica al menos un campo para actualizar.")
}).strict();

export const contentSlugSchema = z.object({ type: editorialContentTypeSchema, slug: z.string().trim().min(1) }).strict();
export const publishEditorialContentSchema = contentSlugSchema.extend({ confirmation: z.literal("PUBLICAR") }).strict();
export const archiveEditorialContentSchema = contentSlugSchema.extend({ confirmation: z.literal("ARCHIVAR") }).strict();

function publicUrl(type: keyof typeof typeMap, slug: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${site}/${typePath[type]}/${slug}`;
}

function editUrl(type: keyof typeof typeMap, slug: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const panel = type === "editorial" ? "editoriales" : type === "research" ? "investigacion" : "reflexiones";
  return `${site}/panel/${panel}/${slug}`;
}

function revalidate(type: keyof typeof typeMap, slug: string) {
  revalidatePublicContentCache();
  const path = typePath[type];
  const panel = type === "editorial" ? "editoriales" : type === "research" ? "investigacion" : "reflexiones";
  for (const route of ["/", "/panel", `/${path}`, `/${path}/${slug}`, `/panel/${panel}`, `/panel/${panel}/${slug}`, "/sitemap.xml"]) revalidatePath(route);
}

function result(item: { id: string; slug: string; status: ContentStatus; updatedAt: Date }, type: keyof typeof typeMap) {
  return { id: item.id, slug: item.slug, status: item.status, updated_at: item.updatedAt.toISOString(), edit_url: editUrl(type, item.slug), public_url: item.status === ContentStatus.PUBLISHED ? publicUrl(type, item.slug) : null };
}

export async function listEditorialContent(input: unknown) {
  const args = listEditorialContentSchema.parse(input);
  const items = await db.content.findMany({
    where: { type: typeMap[args.type], ...(args.status === "ALL" ? {} : { status: args.status }), ...(args.query ? { OR: [{ title: { contains: args.query, mode: "insensitive" } }, { summary: { contains: args.query, mode: "insensitive" } }, { slug: { contains: args.query, mode: "insensitive" } }] } : {}) },
    select: { id: true, title: true, slug: true, summary: true, status: true, updatedAt: true, tags: true },
    orderBy: { updatedAt: "desc" }, take: args.limit
  });
  return { items: items.map((item) => ({ ...item, ...result(item, args.type) })) };
}

export async function getEditorialContent(input: unknown) {
  const args = contentSlugSchema.parse(input);
  const item = await db.content.findUnique({ where: { slug: args.slug }, include: { media: { where: { mediaType: "image", isSensitive: false }, select: { id: true, title: true, altText: true, caption: true, storagePath: true, isFeatured: true, origin: true } } } });
  if (!item || item.type !== typeMap[args.type]) throw new Error("No se encontró el contenido solicitado.");
  return { ...item, ...result(item, args.type), media: item.media };
}

export async function createEditorialContent(input: unknown, options: PublicationImagesOptions = {}) {
  const args = createEditorialContentSchema.parse(input);
  if (args.type === "reflection" && !args.files?.length) throw new Error("Las reflexiones requieren una imagen. Adjunta el archivo para crear el borrador.");
  if (args.files?.length && (!args.imageTitle || !args.imageAltText)) throw new Error("Al adjuntar una imagen indica imageTitle e imageAltText.");
  if (args.type !== "reflection" && args.files?.length) throw new Error("La carga de imágenes por este flujo está habilitada para Reflexiones. Usa el panel para imágenes editoriales o de investigación.");
  const image = args.files?.[0]
    ? await resolvePublicationImage({ file: args.files[0] }, options.downloadAttachment ?? downloadPublicationAttachment)
    : null;
  const imagePath = image ? await storePublicationImage(image.bytes) : null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = await resolveUniqueContentSlug(attempt ? `${args.title} ${attempt + 1}` : args.title);
    try {
      const item = await db.content.create({
        data: {
          type: typeMap[args.type],
          status: args.status,
          title: args.title,
          slug,
          summary: args.summary,
          body: args.body,
          source: args.source || "ChatGPT",
          author: "Dr. Antonio Camargo",
          tags: args.tags,
          ...(imagePath && args.imageTitle && args.imageAltText
            ? {
                media: {
                  create: {
                    title: args.imageTitle,
                    altText: args.imageAltText,
                    caption: args.imageCaption,
                    storagePath: imagePath,
                    mediaType: "image",
                    isSensitive: false,
                    isFeatured: true,
                    origin: "upload"
                  }
                }
              }
            : {}),
          importLogs: {
            create: {
              source: "mcp:create_editorial_content",
              payloadType: args.type,
              payloadSummary: `Borrador creado desde ChatGPT: ${args.title}`,
              state: "VALIDATED"
            }
          }
        }
      });
      revalidate(args.type, slug);
      return { ...result(item, args.type), title: item.title, summary: item.summary, featured_image_url: imagePath };
    } catch (error) { if (!isUniqueConstraintError(error) || attempt === 4) throw error; }
  }
  throw new Error("No se pudo crear el borrador.");
}

export async function setReflectionImage(input: unknown, options: PublicationImagesOptions = {}) {
  const args = setReflectionImageSchema.parse(input);
  const current = await db.content.findUnique({ where: { slug: args.slug }, select: { id: true, type: true, status: true, updatedAt: true } });
  if (!current || current.type !== ContentType.REFLECTION) throw new Error("No se encontró la reflexión solicitada.");
  if (current.status === ContentStatus.ARCHIVED) throw new Error("La reflexión está archivada; restáurala desde el panel antes de editarla.");
  if (args.expectedUpdatedAt && current.updatedAt.toISOString() !== new Date(args.expectedUpdatedAt).toISOString()) throw new Error("La reflexión cambió desde la última lectura. Recupérala de nuevo antes de editar.");
  if (current.status === ContentStatus.PUBLISHED && args.confirmation !== "ACTUALIZAR_PUBLICADO") throw new Error("Cambiar la imagen de una reflexión publicada requiere confirmation=ACTUALIZAR_PUBLICADO.");

  const image = await resolvePublicationImage({ file: args.files[0] }, options.downloadAttachment ?? downloadPublicationAttachment);
  const storagePath = await storePublicationImage(image.bytes);
  const saved = await db.$transaction(async (tx) => {
    const latest = await tx.content.findUnique({ where: { id: current.id }, select: { type: true, status: true, updatedAt: true } });
    if (!latest || latest.type !== ContentType.REFLECTION || latest.status === ContentStatus.ARCHIVED) throw new Error("La reflexión ya no está disponible para editar.");
    if (args.expectedUpdatedAt && latest.updatedAt.toISOString() !== new Date(args.expectedUpdatedAt).toISOString()) throw new Error("La reflexión cambió durante la carga. Recupérala de nuevo antes de editar.");
    if (latest.status === ContentStatus.PUBLISHED && args.confirmation !== "ACTUALIZAR_PUBLICADO") throw new Error("Cambiar la imagen de una reflexión publicada requiere confirmation=ACTUALIZAR_PUBLICADO.");
    await tx.mediaAsset.updateMany({ where: { contentId: current.id, mediaType: "image", isFeatured: true }, data: { isFeatured: false } });
    const asset = await tx.mediaAsset.create({ data: { contentId: current.id, title: args.imageTitle, altText: args.imageAltText, caption: args.imageCaption, storagePath, mediaType: "image", isSensitive: false, isFeatured: true, origin: "upload" } });
    const item = await tx.content.update({ where: { id: current.id }, data: { updatedAt: new Date(), importLogs: { create: { source: "mcp:set_reflection_image", payloadType: "reflection", payloadSummary: `Imagen principal actualizada: ${args.imageTitle}`, state: "VALIDATED" } } } });
    return { item, asset };
  });
  revalidate("reflection", args.slug);
  return { ...result(saved.item, "reflection"), image_id: saved.asset.id, image_url: saved.asset.storagePath, image_title: saved.asset.title };
}

export async function updateEditorialContent(input: unknown) {
  const args = updateEditorialContentSchema.parse(input);
  const current = await db.content.findUnique({ where: { slug: args.slug } });
  if (!current || current.type !== typeMap[args.type]) throw new Error("No se encontró el contenido solicitado.");
  if (current.status === ContentStatus.ARCHIVED) throw new Error("El contenido está archivado; restáuralo desde el panel antes de editarlo.");
  if (args.expectedUpdatedAt && current.updatedAt.toISOString() !== new Date(args.expectedUpdatedAt).toISOString()) throw new Error("El contenido cambió desde la última lectura. Recupéralo de nuevo antes de editar.");
  if (current.status === ContentStatus.PUBLISHED && args.confirmation !== "ACTUALIZAR_PUBLICADO") throw new Error("Editar contenido publicado requiere confirmation=ACTUALIZAR_PUBLICADO.");
  const item = await db.content.update({ where: { id: current.id }, data: { ...args.changes, importLogs: { create: { source: "mcp:update_editorial_content", payloadType: args.type, payloadSummary: `Campos actualizados: ${Object.keys(args.changes).join(", ")}`, state: "VALIDATED" } } } });
  revalidate(args.type, args.slug);
  return { ...result(item, args.type), changed: true };
}

export async function publishEditorialContent(input: unknown) {
  const args = publishEditorialContentSchema.parse(input);
  const current = await db.content.findUnique({ where: { slug: args.slug } });
  if (!current || current.type !== typeMap[args.type]) throw new Error("No se encontró el contenido solicitado.");
  if (current.status === ContentStatus.ARCHIVED) throw new Error("No se puede publicar contenido archivado.");
  if (current.title.trim().length < 5 || current.summary.trim().length < 20 || current.body.trim().length < 50) throw new Error("Completa título, resumen y cuerpo antes de publicar.");
  if (args.type === "reflection") {
    const image = await db.mediaAsset.findFirst({ where: { contentId: current.id, mediaType: "image", isFeatured: true, isSensitive: false, isGalleryUpload: false }, select: { id: true } });
    if (!image) throw new Error("No se puede publicar una reflexión sin imagen principal. Usa set_reflection_image y vuelve a intentarlo.");
  }
  const item = await db.content.update({ where: { id: current.id }, data: { status: ContentStatus.PUBLISHED, publishedAt: current.publishedAt ?? new Date(), importLogs: { create: { source: "mcp:publish_editorial_content", payloadType: args.type, payloadSummary: `Publicación confirmada desde ChatGPT: ${current.title}`, state: "VALIDATED" } } } });
  revalidate(args.type, args.slug);
  return { ...result(item, args.type), title: item.title };
}

export async function archiveEditorialContent(input: unknown) {
  const args = archiveEditorialContentSchema.parse(input);
  const current = await db.content.findUnique({ where: { slug: args.slug } });
  if (!current || current.type !== typeMap[args.type]) throw new Error("No se encontró el contenido solicitado.");
  const item = current.status === ContentStatus.ARCHIVED ? current : await db.content.update({ where: { id: current.id }, data: { status: ContentStatus.ARCHIVED, publishedAt: null, importLogs: { create: { source: "mcp:archive_editorial_content", payloadType: args.type, payloadSummary: `Archivado desde ChatGPT: ${current.title}`, state: "VALIDATED" } } } });
  revalidate(args.type, args.slug);
  return { ...result(item, args.type), changed: current.status !== ContentStatus.ARCHIVED };
}
