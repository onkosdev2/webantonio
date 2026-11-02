import { ContentStatus, ContentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolvePublicationImage, storePublicationImage } from "@/lib/storage/publication-images";
import { downloadPublicationAttachment, type AttachmentDownloader } from "@/lib/storage/publication-attachments";
import type { PublicationImagesOptions } from "@/lib/content/services/publication-images";

const attachmentSchema = z.object({ download_url: z.string().min(1).max(8192), file_id: z.string().min(1).max(300), mime_type: z.string().max(120).optional(), file_name: z.string().max(255).optional() }).strict();
const base = { id: z.string().min(1) };
export const createGalleryAssetSchema = z.object({
  files: z.array(attachmentSchema).length(1).describe("Adjunta exactamente una imagen mediante el cliente MCP."),
  title: z.string().trim().min(3).max(250),
  description: z.string().trim().min(10).max(1500).describe("Descripción obligatoria y accesible de la imagen."),
  anonymizedConfirmed: z.literal(true).describe("Confirma que la imagen fue revisada y no identifica al paciente."),
  caseSlug: z.string().trim().min(1).optional().describe("Vincula opcionalmente con un caso clínico ya publicado.")
}).strict();
export const listGalleryAssetsSchema = z.object({ status: z.enum(["ALL", "PRIVATE", "PUBLISHED"]).default("ALL"), query: z.string().trim().max(200).default(""), limit: z.number().int().min(1).max(50).default(20) }).strict();
export const galleryAssetIdSchema = z.object(base).strict();
export const updateGalleryAssetSchema = z.object({ ...base, title: z.string().trim().min(3).max(250).optional(), description: z.string().trim().min(10).max(1500).optional(), caseSlug: z.string().trim().min(1).nullable().optional() }).strict().refine((value) => value.title !== undefined || value.description !== undefined || value.caseSlug !== undefined, "Indica qué campo deseas actualizar.");
export const publishGalleryAssetSchema = z.object({ ...base, confirmation: z.literal("PUBLICAR") }).strict();
export const archiveGalleryAssetSchema = z.object({ ...base, confirmation: z.literal("ARCHIVAR") }).strict();

function revalidate() { revalidatePath("/galeria"); revalidatePath("/panel/galeria"); }
async function resolveCaseId(slug: string | null | undefined) {
  if (slug === null || slug === undefined || slug === "") return null;
  const item = await db.content.findUnique({ where: { slug }, select: { id: true, type: true, status: true, title: true, slug: true } });
  if (!item || item.type !== ContentType.CLINICAL_CASE || item.status !== ContentStatus.PUBLISHED) throw new Error("Solo puedes vincular la imagen con un caso clínico publicado.");
  return item;
}
function publicImageUrl(path: string) { return path.startsWith("http") ? path : `${(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`; }
function mapAsset(item: { id: string; title: string; altText: string | null; storagePath: string; isSensitive: boolean; createdAt: Date; content: { slug: string; title: string; status: ContentStatus } | null }) {
  const visible = !item.isSensitive && (!item.content || item.content.status === ContentStatus.PUBLISHED);
  return { id: item.id, title: item.title, description: item.altText ?? "", image_url: visible ? publicImageUrl(item.storagePath) : null, status: visible ? "PUBLISHED" as const : "PRIVATE" as const, case_slug: item.content?.slug ?? null, case_title: item.content?.title ?? null, created_at: item.createdAt.toISOString() };
}
async function findGalleryAsset(id: string) {
  const item = await db.mediaAsset.findUnique({ where: { id }, include: { content: { select: { slug: true, title: true, status: true } } } });
  if (!item || item.origin !== "mcp_gallery" || item.mediaType !== "image") throw new Error("No se encontró una imagen independiente cargada mediante MCP.");
  return item;
}

export async function createGalleryAsset(input: unknown, options: PublicationImagesOptions = {}) {
  const args = createGalleryAssetSchema.parse(input);
  const downloader: AttachmentDownloader = options.downloadAttachment ?? downloadPublicationAttachment;
  const file = await resolvePublicationImage({ file: args.files[0] }, downloader);
  const linkedCase = await resolveCaseId(args.caseSlug);
  const storagePath = await storePublicationImage(file.bytes);
  const item = await db.mediaAsset.create({ data: { title: args.title, altText: args.description, storagePath, mediaType: "image", isSensitive: true, isFeatured: false, origin: "mcp_gallery", contentId: linkedCase?.id ?? null }, include: { content: { select: { slug: true, title: true, status: true } } } });
  revalidate();
  return mapAsset(item);
}

export async function listGalleryAssets(input: unknown) {
  const args = listGalleryAssetsSchema.parse(input);
  const visibility = args.status === "PRIVATE"
    ? { OR: [{ isSensitive: true }, { content: { is: { status: { not: ContentStatus.PUBLISHED } } } }] }
    : args.status === "PUBLISHED"
      ? { isSensitive: false, OR: [{ contentId: null }, { content: { is: { status: ContentStatus.PUBLISHED } } }] }
      : {};
  const search = args.query ? { OR: [{ title: { contains: args.query, mode: "insensitive" as const } }, { altText: { contains: args.query, mode: "insensitive" as const } }] } : {};
  const items = await db.mediaAsset.findMany({ where: { origin: "mcp_gallery", mediaType: "image", ...visibility, ...(args.query ? { AND: [search] } : {}) }, include: { content: { select: { slug: true, title: true, status: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: args.limit });
  return { items: items.map(mapAsset) };
}

export async function getGalleryAsset(input: unknown) { const { id } = galleryAssetIdSchema.parse(input); return mapAsset(await findGalleryAsset(id)); }

export async function updateGalleryAsset(input: unknown) {
  const args = updateGalleryAssetSchema.parse(input);
  const current = await findGalleryAsset(args.id);
  if (!current.isSensitive) throw new Error("La imagen ya está publicada. Usa una acción editorial en el panel para cambiarla.");
  const linkedCase = args.caseSlug === undefined ? undefined : await resolveCaseId(args.caseSlug);
  const item = await db.mediaAsset.update({ where: { id: args.id }, data: { ...(args.title !== undefined ? { title: args.title } : {}), ...(args.description !== undefined ? { altText: args.description } : {}), ...(linkedCase !== undefined ? { contentId: linkedCase?.id ?? null } : {}) }, include: { content: { select: { slug: true, title: true, status: true } } } });
  revalidate();
  return mapAsset(item);
}

export async function publishGalleryAsset(input: unknown) {
  const { id } = publishGalleryAssetSchema.parse(input);
  const current = await findGalleryAsset(id);
  if (current.contentId) await resolveCaseId(current.content?.slug);
  const item = await db.mediaAsset.update({ where: { id }, data: { isSensitive: false }, include: { content: { select: { slug: true, title: true, status: true } } } });
  revalidate();
  return mapAsset(item);
}

export async function archiveGalleryAsset(input: unknown) {
  const { id } = archiveGalleryAssetSchema.parse(input);
  const current = await findGalleryAsset(id);
  const item = current.isSensitive ? current : await db.mediaAsset.update({ where: { id }, data: { isSensitive: true }, include: { content: { select: { slug: true, title: true, status: true } } } });
  revalidate();
  return { ...mapAsset(item), archived: true };
}
