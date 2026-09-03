import { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findPersonalIdentifierRisks } from "@/lib/ai/privacy";

export const publicationEntitySchema = z.enum(["clinical_case", "news_item"]);
export type PublicationEntity = z.infer<typeof publicationEntitySchema>;
export const publicationType = (entity: PublicationEntity) => entity === "clinical_case" ? ContentType.CLINICAL_CASE : ContentType.NEWS_ITEM;
const text = (min: number) => z.string().trim().min(min);
const strings = z.array(text(1)).max(100);
const commonPatch = {
  title: text(10).optional(), summary: text(40).optional(), body: text(120).optional(),
  tags: strings.optional(), tumorType: text(2).optional(), biomarkers: strings.optional()
};
const target = {
  slug: text(1),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  confirmation: z.literal("ACTUALIZAR_PUBLICADO").optional()
};
export const updateClinicalCaseSchema = z.object({
  ...target,
  anonymizedConfirmed: z.literal(true),
  changes: z.object({
    ...commonPatch,
    stage: z.string().trim().nullable().optional(),
    treatmentLine: z.string().trim().nullable().optional(),
    treatmentPlan: z.string().trim().nullable().optional(),
    response: z.string().trim().nullable().optional(),
    toxicities: strings.optional(),
    evidenceLevel: z.string().trim().nullable().optional(),
    reviewNotes: z.string().trim().nullable().optional()
  }).strict().refine((value) => Object.keys(value).length > 0, "Indica al menos un campo para actualizar.")
}).strict();
export const sourceUrlSchema = text(1).url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "La fuente debe usar HTTP o HTTPS.");
export const updateNewsSchema = z.object({
  ...target,
  changes: z.object({ ...commonPatch, sourceName: text(2).optional(), sourceUrl: sourceUrlSchema.optional() })
    .strict().refine((value) => Object.keys(value).length > 0, "Indica al menos un campo para actualizar.")
}).strict();
export const archivePublicationSchema = z.object({
  slug: text(1), confirmation: z.literal("ARCHIVAR"),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional()
}).strict();

export function revalidatePublication(entity: PublicationEntity, slug: string) {
  const section = entity === "clinical_case" ? "casos-clinicos" : "noticias";
  const panel = entity === "clinical_case" ? "casos" : "noticias";
  for (const path of ["/", "/panel", "/galeria", `/panel/${panel}`, `/panel/${panel}/${slug}`, `/${section}`, `/${section}/${slug}`, "/sitemap.xml", "/news-sitemap.xml"]) revalidatePath(path);
}

export async function lockPublication(tx: Prisma.TransactionClient, entity: PublicationEntity, slug: string) {
  // Serialize edits, cover changes and gallery ordering on the same publication.
  await tx.$queryRaw`SELECT id FROM "Content" WHERE slug = ${slug} FOR UPDATE`;
  const item = await tx.content.findUnique({ where: { slug }, include: { oncologyData: true } });
  if (!item || item.type !== publicationType(entity)) throw new Error("Publicación no encontrada para la entidad indicada.");
  return item;
}

export function assertPublicationEditable(item: { status: ContentStatus; updatedAt: Date }, input: { confirmation?: string; expectedUpdatedAt?: string }) {
  if (input.expectedUpdatedAt && item.updatedAt.toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) throw new Error("La publicación cambió desde la última lectura. Recupérala de nuevo antes de actualizar.");
  if (item.status === ContentStatus.ARCHIVED) throw new Error("La publicación está archivada. Restáurala desde el panel antes de modificarla.");
  if (item.status === ContentStatus.PUBLISHED && input.confirmation !== "ACTUALIZAR_PUBLICADO") throw new Error("Modificar una publicación visible requiere confirmation=ACTUALIZAR_PUBLICADO.");
}

export function assertClinicalPrivacy(value: unknown) {
  const risks = findPersonalIdentifierRisks(JSON.stringify(value));
  if (risks.length) throw new Error(`Posibles identificadores personales: ${risks.map((risk) => risk.label).join(", ")}. Anonimiza el contenido antes de guardar.`);
}

export function publicationResult(item: { id: string; slug: string; status: ContentStatus; updatedAt: Date }, entity: PublicationEntity) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return { id: item.id, slug: item.slug, status: item.status, updated_at: item.updatedAt.toISOString(),
    edit_url: `${site}/panel/${entity === "clinical_case" ? "casos" : "noticias"}/${item.slug}`,
    public_url: item.status === ContentStatus.PUBLISHED ? `${site}/${entity === "clinical_case" ? "casos-clinicos" : "noticias"}/${item.slug}` : null };
}

export async function updatePublication(entity: PublicationEntity, input: unknown) {
  const data = entity === "clinical_case" ? updateClinicalCaseSchema.parse(input) : updateNewsSchema.parse(input);
  const result = await db.$transaction(async (tx) => {
    const current = await lockPublication(tx, entity, data.slug);
    assertPublicationEditable(current, data);
    const changes = data.changes as Record<string, unknown>;
    const content: Record<string, unknown> = {};
    const oncology: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) {
      const field = key === "sourceName" ? "source" : key;
      if (["title", "summary", "body", "tags", "source", "sourceUrl"].includes(field)) {
        if (JSON.stringify(current[field as keyof typeof current]) !== JSON.stringify(value)) content[field] = value;
      } else if (JSON.stringify(current.oncologyData?.[field as keyof NonNullable<typeof current.oncologyData>]) !== JSON.stringify(value)) oncology[field] = value;
    }
    if (entity === "clinical_case") {
      assertClinicalPrivacy({ title: current.title, summary: current.summary, body: current.body, ...content,
        oncology: { ...current.oncologyData, ...oncology, id: undefined, contentId: undefined } });
    } else {
      sourceUrlSchema.parse(changes.sourceUrl ?? current.sourceUrl);
      text(2).parse(changes.sourceName ?? current.source);
      const duplicate = await tx.content.findFirst({ where: { type: ContentType.NEWS_ITEM, sourceUrl: String(changes.sourceUrl ?? current.sourceUrl), id: { not: current.id } }, select: { id: true } });
      if (duplicate) throw new Error("La URL de fuente ya pertenece a otra noticia.");
    }
    const visualChanged = entity === "clinical_case" && (Object.keys(content).some((key) => key !== "tags") || Object.keys(oncology).length > 0);
    if (!Object.keys(content).length && !Object.keys(oncology).length) return { ...publicationResult(current, entity), changed: false, visual_plan_stale: false };
    const saved = await tx.content.update({ where: { id: current.id }, data: {
      ...content,
      ...(Object.keys(oncology).length ? { oncologyData: { upsert: {
        create: { ...oncology, anonymized: true }, update: { ...oncology, ...(entity === "clinical_case" ? { anonymized: true } : {}) }
      } } } : {}),
      importLogs: { create: { source: `mcp:update_${entity}`, payloadType: entity, payloadSummary: `Campos actualizados: ${Object.keys(changes).join(", ")}`, state: "VALIDATED" } }
    } });
    if (visualChanged) await tx.caseVisualPlan.updateMany({ where: { contentId: current.id, isCurrent: true }, data: { status: "STALE" } });
    return { ...publicationResult(saved, entity), changed: true, visual_plan_stale: visualChanged };
  });
  revalidatePublication(entity, data.slug);
  return result;
}

export async function archivePublication(entity: PublicationEntity, input: unknown) {
  const data = archivePublicationSchema.parse(input);
  const result = await db.$transaction(async (tx) => {
    const current = await lockPublication(tx, entity, data.slug);
    if (current.status === ContentStatus.ARCHIVED) return { ...publicationResult(current, entity), changed: false };
    if (data.expectedUpdatedAt && current.updatedAt.toISOString() !== new Date(data.expectedUpdatedAt).toISOString()) throw new Error("La publicación cambió. Vuelve a consultarla antes de archivar.");
    const saved = await tx.content.update({ where: { id: current.id }, data: {
      status: ContentStatus.ARCHIVED, publishedAt: null,
      importLogs: { create: { source: `mcp:archive_${entity}`, payloadType: entity, payloadSummary: `Archivado confirmado: ${current.title}`, state: "VALIDATED" } }
    } });
    return { ...publicationResult(saved, entity), changed: true };
  });
  revalidatePublication(entity, data.slug);
  return result;
}
