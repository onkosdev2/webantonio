import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { galleryUploadWhere, isGalleryUpload } from "@/lib/content/gallery-policy";
import { decodePublicationImage, storePublicationImage } from "@/lib/storage/publication-images";
import { assertClinicalPrivacy, assertPublicationEditable, lockPublication, publicationEntitySchema, publicationResult, revalidatePublication } from "./publication-mutations";

// A gallery accepts files uploaded for that purpose, never IDs or generated assets.
const imageInputSchema = z.object({
  imageBase64: z.string().min(4).max(14_000_000).describe("Archivo PNG/JPEG/WEBP cargado expresamente para esta acción. No acepta mediaId, rutas ni URLs."),
  title: z.string().trim().min(3).max(250),
  altText: z.string().trim().min(10).max(1000),
  caption: z.string().trim().max(2000).optional()
}).strict();

export const managePublicationImagesSchema = z.object({
  entity: publicationEntitySchema,
  slug: z.string().min(1),
  action: z.enum(["add_gallery", "replace_gallery", "set_featured", "reorder_gallery", "remove_gallery"]),
  images: z.array(imageInputSchema).min(1).max(20).optional(),
  mediaIds: z.array(z.string().min(1)).min(1).max(30).optional(),
  featuredMediaId: z.string().min(1).optional(),
  anonymizedConfirmed: z.literal(true).optional().describe("Obligatorio al cargar archivos a un caso clínico; confirma revisión humana y ausencia de identificadores."),
  confirmation: z.literal("ACTUALIZAR_PUBLICADO").optional(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional()
}).strict().superRefine((data, ctx) => {
  const galleryUpload = ["add_gallery", "replace_gallery"].includes(data.action);
  const ordering = ["reorder_gallery", "remove_gallery"].includes(data.action);
  const validAction = galleryUpload
    ? Boolean(data.images) && !data.mediaIds && !data.featuredMediaId
    : ordering
      ? Boolean(data.mediaIds) && !data.images && !data.featuredMediaId
      : !data.mediaIds && (data.featuredMediaId ? !data.images : data.images?.length === 1);
  if (!validAction) ctx.addIssue({ code: "custom", message: "Galería: images con archivos nuevos. Ordenar/quitar: mediaIds de la galería. Portada: featuredMediaId o un solo archivo en images, nunca ambos." });
  if (data.images && data.entity === "clinical_case" && !data.anonymizedConfirmed) ctx.addIssue({ code: "custom", message: "Confirma anonymizedConfirmed=true tras revisar todas las imágenes clínicas." });
  if (data.mediaIds && new Set(data.mediaIds).size !== data.mediaIds.length) ctx.addIssue({ code: "custom", message: "mediaIds no puede contener duplicados." });
  if ((data.images || []).reduce((sum, item) => sum + item.imageBase64.length, 0) > 28_000_000) ctx.addIssue({ code: "custom", message: "El lote no puede superar 20 MB de archivos." });
});

export async function managePublicationImages(input: unknown) {
  const data = managePublicationImagesSchema.parse(input);
  if (data.entity === "clinical_case" && data.images) assertClinicalPrivacy(data.images.map(({ title, altText, caption }) => ({ title, altText, caption })));
  const decoded = await Promise.all((data.images || []).map(async (item) => {
    const bytes = await decodePublicationImage(item.imageBase64);
    return { bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  if (new Set(decoded.map((file) => file.hash)).size !== decoded.length) throw new Error("El lote contiene la misma imagen más de una vez.");

  const result = await db.$transaction(async (tx) => {
    const content = await lockPublication(tx, data.entity, data.slug);
    assertPublicationEditable(content, data);
    const current = await tx.mediaAsset.findMany({ where: { contentId: content.id }, orderBy: [{ galleryOrder: "asc" }, { createdAt: "asc" }] });
    const uploads = current.filter(isGalleryUpload);
    const gallery = uploads.filter((asset) => asset.galleryOrder !== null);
    const ids = data.mediaIds || [];
    if (ids.some((id) => !gallery.some((asset) => asset.id === id))) throw new Error("Los IDs deben ser cargas específicas de la galería de esta publicación, no portadas ni figuras.");
    if (data.action === "reorder_gallery" && ids.length !== gallery.length) throw new Error("Indica todos los identificadores de la galería exactamente una vez.");

    if (data.action === "set_featured") {
      // A direct cover upload creates a publication asset, not a gallery entry.
      let asset = data.featuredMediaId
        ? current.find((item) => item.id === data.featuredMediaId && item.mediaType === "image" && !item.isSensitive && !item.isGalleryUpload)
        : undefined;
      if (data.images) {
        const { title, altText, caption } = data.images[0];
        const storagePath = await storePublicationImage(decoded[0].bytes);
        asset = await tx.mediaAsset.create({ data: { title, altText, caption, storagePath, contentId: content.id, mediaType: "image", origin: "upload", isFeatured: false, isGalleryUpload: false } });
      }
      if (!asset) throw new Error("La portada debe ser una imagen de la publicación, nunca una carga exclusiva de galería. También puedes cargar un archivo de portada directamente.");
      await tx.mediaAsset.updateMany({ where: { contentId: content.id, isGalleryUpload: false }, data: { isFeatured: false } });
      await tx.mediaAsset.update({ where: { id: asset.id }, data: { isFeatured: true } });
      if (data.entity === "clinical_case") {
        await tx.caseFigure.updateMany({ where: { plan: { contentId: content.id, isCurrent: true } }, data: { isFeatured: false } });
        if (asset.figureId) await tx.caseFigure.update({ where: { id: asset.figureId }, data: { isFeatured: true } });
      }
    } else if (data.action === "remove_gallery") {
      await tx.mediaAsset.updateMany({ where: { contentId: content.id, isGalleryUpload: true, id: { in: ids } }, data: { galleryOrder: null } });
    } else if (data.action === "reorder_gallery") {
      for (const [index, id] of ids.entries()) await tx.mediaAsset.update({ where: { id }, data: { galleryOrder: index } });
    } else {
      const remaining = data.action === "replace_gallery" ? new Set<string>() : new Set(gallery.map((asset) => asset.galleryUploadHash!));
      for (const file of decoded) remaining.add(file.hash);
      if (remaining.size > 30) throw new Error("La galería admite hasta 30 imágenes. Quita algunas antes de agregar más.");
      if (data.action === "replace_gallery") await tx.mediaAsset.updateMany({ where: { contentId: content.id, isGalleryUpload: true }, data: { galleryOrder: null } });
      let position = data.action === "replace_gallery" ? 0 : Math.max(-1, ...gallery.map((asset) => asset.galleryOrder!)) + 1;
      for (const [index, image] of (data.images || []).entries()) {
        const file = decoded[index];
        // Deduplicate only within this publication's dedicated uploads. Never repurpose a cover or figure.
        const existing = uploads.find((asset) => asset.galleryUploadHash === file.hash);
        const order = data.action === "add_gallery" && existing?.galleryOrder !== null && existing?.galleryOrder !== undefined ? existing.galleryOrder : position++;
        const fields = { title: image.title, altText: image.altText, caption: image.caption ?? existing?.caption ?? null, galleryOrder: order };
        if (existing) await tx.mediaAsset.update({ where: { id: existing.id }, data: fields });
        else {
          const storagePath = await storePublicationImage(file.bytes);
          await tx.mediaAsset.create({ data: { ...fields, contentId: content.id, storagePath, mediaType: "image", isSensitive: false, isFeatured: false, origin: "upload", isGalleryUpload: true, galleryUploadHash: file.hash } });
        }
      }
    }
    const saved = await tx.content.update({ where: { id: content.id }, data: { updatedAt: new Date(), importLogs: { create: { source: "mcp:manage_publication_images", payloadType: data.entity, payloadSummary: `Imágenes: ${data.action}`, state: "VALIDATED" } } } });
    const [assets, cover] = await Promise.all([
      tx.mediaAsset.findMany({ where: { ...galleryUploadWhere, contentId: content.id, galleryOrder: { not: null } }, orderBy: [{ galleryOrder: "asc" }, { createdAt: "asc" }] }),
      tx.mediaAsset.findFirst({ where: { contentId: content.id, mediaType: "image", isSensitive: false, isFeatured: true, isGalleryUpload: false } })
    ]);
    return { ...publicationResult(saved, data.entity), action: data.action, featured_media_id: cover?.id ?? null,
      gallery: assets.map((asset) => ({ id: asset.id, image_url: asset.storagePath, alt_text: asset.altText, caption: asset.caption, position: asset.galleryOrder, origin: asset.origin })) };
  }, { timeout: 60_000 });
  revalidatePublication(data.entity, data.slug);
  return result;
}
