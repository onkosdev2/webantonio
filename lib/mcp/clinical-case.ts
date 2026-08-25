import { createHash } from "node:crypto";
import { ContentStatus, ContentType, FigureStatus, VisualPlanStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findPersonalIdentifierRisks } from "@/lib/ai/privacy";
import { generateCaseImages, type ImageAspectRatio, type ImageProvider } from "@/lib/ai/nvidia-images";
import { resolveUniqueContentSlug } from "@/lib/content/slugs";
import { emitClinicalCasePublication } from "@/lib/realtime/clinical-case-publications";

export const placementSchema = z.enum([
  "cover_only",
  "after_introduction",
  "after_heading",
  "end_of_article"
]);

export const manualFigureSchema = z.object({
  title: z.string().min(4),
  category: z.string().min(3),
  purpose: z.string().min(10),
  educationalMessage: z.string().min(10),
  prompt: z.string().min(30),
  placement: placementSchema.default("end_of_article"),
  placementAnchor: z.string().optional(),
  isFeatured: z.boolean().default(false)
}).superRefine((figure, context) => {
  if (figure.placement === "after_heading" && !figure.placementAnchor?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["placementAnchor"], message: "Indica el encabezado tras el cual debe insertarse la imagen." });
  }
});

export const createClinicalCaseSchema = z.object({
  title: z.string().min(10),
  summary: z.string().min(40),
  body: z.string().min(120),
  tumorType: z.string().min(2),
  stage: z.string().optional(),
  biomarkers: z.array(z.string()).default([]),
  treatmentLine: z.string().optional(),
  treatmentPlan: z.string().optional(),
  response: z.string().optional(),
  toxicities: z.array(z.string()).default([]),
  evidenceLevel: z.string().optional(),
  tags: z.array(z.string()).default([]),
  anonymizedConfirmed: z.literal(true),
  figures: z.array(manualFigureSchema).min(3).max(5).optional()
});

export const configureImagesSchema = z.object({
  slug: z.string().min(1),
  figures: z.array(manualFigureSchema).min(3).max(5)
});

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const urls = (slug: string) => ({
  edit_url: `${siteUrl()}/panel/casos/${slug}`,
  public_url: `${siteUrl()}/casos-clinicos/${slug}`
});

function assertPrivateDataIsSafe(input: { title: string; summary: string; body: string }) {
  const risks = findPersonalIdentifierRisks(`${input.title}\n${input.summary}\n${input.body}`);
  if (risks.length) {
    throw new Error(`El caso contiene posibles identificadores personales (${risks.map((risk) => risk.label).join(", ")}). Anonimízalos antes de continuar.`);
  }
}

function validateFeaturedFigures(figures: z.infer<typeof manualFigureSchema>[]) {
  if (figures.filter((figure) => figure.isFeatured).length > 1) {
    throw new Error("Solo una figura puede definirse como imagen principal.");
  }
}

async function createManualPlan(contentId: string, figures: z.infer<typeof manualFigureSchema>[]) {
  validateFeaturedFigures(figures);
  const normalized = figures.map((figure, index) => ({
    ...figure,
    isFeatured: figures.some((item) => item.isFeatured) ? figure.isFeatured : index === 0
  }));
  const sourceHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");

  return db.$transaction(async (tx) => {
    await tx.caseVisualPlan.updateMany({
      where: { contentId, isCurrent: true },
      data: { isCurrent: false, status: VisualPlanStatus.STALE }
    });
    const plan = await tx.caseVisualPlan.create({
      data: {
        contentId,
        sourceHash,
        status: VisualPlanStatus.READY,
        currentStage: "approved_visual_plan",
        model: "chatgpt-mcp",
        qualityScore: 100,
        sharedState: { source: "chatgpt_mcp", figures: normalized },
        figures: {
          create: normalized.map((figure, index) => ({
            figureNumber: index + 1,
            priority: index + 1,
            title: figure.title.trim(),
            category: figure.category.trim(),
            purpose: figure.purpose.trim(),
            educationalMessage: figure.educationalMessage.trim(),
            reason: "Figura definida y aprobada desde la conversación de ChatGPT.",
            score: 100 - index,
            adjustedScore: 100 - index,
            scoreBreakdown: { caseRelevance: 40, diagnosticValue: 25, educationalValue: 20, specificity: 15 },
            supportedFacts: [],
            supportedKnowledge: [],
            recommendedVisualStyle: "Imagen médica editorial, precisa, digna y sin texto incrustado.",
            estimatedDifficulty: "medium",
            draftPrompt: figure.prompt.trim(),
            optimizedPrompt: figure.prompt.trim(),
            placement: figure.placement,
            placementAnchor: figure.placementAnchor?.trim() || null,
            compliance: { approved: true, source: "chatgpt_mcp", reviewedAt: new Date().toISOString() },
            status: FigureStatus.READY,
            isFeatured: figure.isFeatured
          }))
        }
      },
      include: { figures: { orderBy: { figureNumber: "asc" } } }
    });
    return plan;
  });
}

export async function createClinicalCaseDraft(input: z.input<typeof createClinicalCaseSchema>) {
  const data = createClinicalCaseSchema.parse(input);
  assertPrivateDataIsSafe(data);
  if (data.figures) validateFeaturedFigures(data.figures);
  const slug = await resolveUniqueContentSlug(data.title);
  const created = await db.content.create({
    data: {
      type: ContentType.CLINICAL_CASE,
      status: ContentStatus.DRAFT,
      title: data.title.trim(),
      slug,
      summary: data.summary.trim(),
      body: data.body.trim(),
      source: "chatgpt_mcp",
      author: "ChatGPT via MCP",
      tags: [...new Set([...data.tags, "mcp_chatgpt"])],
      oncologyData: { create: {
        tumorType: data.tumorType,
        stage: data.stage || null,
        biomarkers: data.biomarkers,
        treatmentLine: data.treatmentLine || null,
        treatmentPlan: data.treatmentPlan || null,
        response: data.response || null,
        toxicities: data.toxicities,
        evidenceLevel: data.evidenceLevel || null,
        anonymized: true
      } },
      importLogs: { create: {
        source: "mcp:create_clinical_case_draft",
        payloadType: "clinical_case",
        payloadSummary: `Borrador recibido desde ChatGPT: ${data.title}`,
        state: "VALIDATED",
        notes: "Anonimización confirmada por el usuario y validación automática superada."
      } }
    },
    include: { oncologyData: true }
  });
  const plan = data.figures ? await createManualPlan(created.id, data.figures) : null;
  revalidatePath("/panel/casos");
  return { id: created.id, slug, status: created.status, visual_plan_status: plan?.status ?? "NOT_CONFIGURED", ...urls(slug) };
}

export async function configureCaseImages(input: z.input<typeof configureImagesSchema>) {
  const data = configureImagesSchema.parse(input);
  const content = await db.content.findUnique({ where: { slug: data.slug } });
  if (!content || content.type !== ContentType.CLINICAL_CASE) throw new Error("Caso clínico no encontrado.");
  const plan = await createManualPlan(content.id, data.figures);
  revalidatePath(`/panel/casos/${content.slug}`);
  return { slug: content.slug, status: plan.status, figure_count: plan.figures.length, figures: plan.figures.map((figure) => ({ id: figure.id, figure_number: figure.figureNumber, title: figure.title, placement: figure.placement, is_featured: figure.isFeatured })) };
}

function normalizeHeading(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase();
}

export function placeMarkdownImage(body: string, markdown: string, placement: string, anchor?: string | null) {
  if (body.includes(markdown) || body.includes(markdown.match(/\((.*?)\)/)?.[1] ?? "__never__")) return { body, fallback: false };
  if (placement === "after_introduction") {
    const match = /\n\s*\n/.exec(body);
    if (match?.index !== undefined) return { body: `${body.slice(0, match.index)}\n\n${markdown}${body.slice(match.index)}`, fallback: false };
  }
  if (placement === "after_heading" && anchor) {
    const lines = body.split("\n");
    const target = normalizeHeading(anchor);
    const index = lines.findIndex((line) => /^#{1,6}\s+/.test(line) && normalizeHeading(line.replace(/^#{1,6}\s+/, "")) === target);
    if (index >= 0) {
      lines.splice(index + 1, 0, "", markdown);
      return { body: lines.join("\n"), fallback: false };
    }
  }
  return { body: `${body.trimEnd()}\n\n${markdown}\n`, fallback: placement !== "end_of_article" };
}

export async function generateCaseImage(input: { slug: string; figureNumber: number; provider?: ImageProvider; aspectRatio?: ImageAspectRatio; insertInBody?: boolean; altText?: string }) {
  const content = await db.content.findUnique({ where: { slug: input.slug }, include: { oncologyData: true } });
  if (!content || content.type !== ContentType.CLINICAL_CASE) throw new Error("Caso clínico no encontrado.");
  const figure = await db.caseFigure.findFirst({ where: { figureNumber: input.figureNumber, plan: { contentId: content.id, isCurrent: true, status: VisualPlanStatus.READY } } });
  if (!figure?.optimizedPrompt) throw new Error("La figura no está lista o no tiene un prompt aprobado.");
  await db.caseFigure.update({ where: { id: figure.id }, data: { status: FigureStatus.GENERATING } });
  try {
    const [generated] = await generateCaseImages({
      title: content.title, summary: content.summary, body: content.body,
      tumorType: content.oncologyData?.tumorType || "", stage: content.oncologyData?.stage || "",
      biomarkers: Array.isArray(content.oncologyData?.biomarkers) ? content.oncologyData.biomarkers.filter((item): item is string => typeof item === "string") : [],
      treatmentLine: content.oncologyData?.treatmentLine || "", treatmentPlan: content.oncologyData?.treatmentPlan || "",
      evidenceLevel: content.oncologyData?.evidenceLevel || "", tone: "editorial médico",
      aspectRatio: input.aspectRatio || "16:9", promptOverride: figure.optimizedPrompt, provider: input.provider || "openai"
    });
    const altText = input.altText?.trim() || `${figure.educationalMessage}. Imagen educativa generada por IA; no corresponde a un estudio diagnóstico real.`;
    const placed = input.insertInBody !== false && figure.placement !== "cover_only"
      ? placeMarkdownImage(content.body, `![${altText}](${generated.url})`, figure.placement, figure.placementAnchor)
      : { body: content.body, fallback: false };
    const asset = await db.$transaction(async (tx) => {
      if (figure.isFeatured) await tx.mediaAsset.updateMany({ where: { contentId: content.id }, data: { isFeatured: false } });
      const created = await tx.mediaAsset.create({ data: {
        contentId: content.id, figureId: figure.id, title: `Figura ${figure.figureNumber} · ${figure.title}`,
        altText, storagePath: generated.url, mediaType: "image", origin: generated.origin,
        prompt: generated.prompt, model: generated.model, isFeatured: figure.isFeatured
      } });
      await tx.caseFigure.update({ where: { id: figure.id }, data: { status: FigureStatus.GENERATED } });
      if (placed.body !== content.body) await tx.content.update({ where: { id: content.id }, data: { body: placed.body } });
      return created;
    });
    revalidatePath(`/panel/casos/${content.slug}`); revalidatePath(`/casos-clinicos/${content.slug}`);
    return { media_id: asset.id, image_url: asset.storagePath, is_featured: asset.isFeatured, inserted_in_body: placed.body !== content.body, placement_fallback: placed.fallback };
  } catch (error) {
    await db.caseFigure.update({ where: { id: figure.id }, data: { status: FigureStatus.FAILED } }).catch(() => undefined);
    throw error;
  }
}

export async function setCaseFeaturedImage(input: { slug: string; mediaId: string }) {
  const content = await db.content.findUnique({ where: { slug: input.slug } });
  const asset = content ? await db.mediaAsset.findFirst({ where: { id: input.mediaId, contentId: content.id } }) : null;
  if (!content || content.type !== ContentType.CLINICAL_CASE || !asset) throw new Error("La imagen no pertenece al caso clínico indicado.");
  await db.$transaction(async (tx) => {
    await tx.mediaAsset.updateMany({ where: { contentId: content.id }, data: { isFeatured: false } });
    await tx.mediaAsset.update({ where: { id: asset.id }, data: { isFeatured: true } });
    await tx.caseFigure.updateMany({ where: { plan: { contentId: content.id, isCurrent: true } }, data: { isFeatured: false } });
    if (asset.figureId) await tx.caseFigure.update({ where: { id: asset.figureId }, data: { isFeatured: true } });
  });
  revalidatePath(`/casos-clinicos/${content.slug}`);
  return { slug: content.slug, featured_media_id: asset.id, featured_image_url: asset.storagePath };
}

export async function publishClinicalCase(input: { slug: string; confirmation: string }) {
  if (input.confirmation !== "PUBLICAR") throw new Error("La publicación requiere confirmación explícita con la palabra PUBLICAR.");
  const content = await db.content.findUnique({ where: { slug: input.slug }, include: { oncologyData: true, media: true } });
  if (!content || content.type !== ContentType.CLINICAL_CASE) throw new Error("Caso clínico no encontrado.");
  if (!content.oncologyData?.anonymized) throw new Error("Confirma la anonimización antes de publicar.");
  assertPrivateDataIsSafe(content);
  if (!content.media.some((asset) => asset.isFeatured)) throw new Error("Define una imagen principal antes de publicar.");
  const updated = await db.content.update({ where: { id: content.id }, data: { status: ContentStatus.PUBLISHED, publishedAt: content.publishedAt || new Date(), importLogs: { create: { source: "mcp:publish_clinical_case", payloadType: "clinical_case", payloadSummary: `Publicación confirmada desde ChatGPT: ${content.title}`, state: "VALIDATED" } } } });
  revalidatePath("/"); revalidatePath("/casos-clinicos"); revalidatePath(`/casos-clinicos/${content.slug}`);

  if (content.status !== ContentStatus.PUBLISHED && updated.publishedAt) {
    emitClinicalCasePublication({
      slug: updated.slug,
      title: updated.title,
      summary: updated.summary,
      publishedAt: updated.publishedAt.toISOString(),
      href: `${siteUrl()}/casos-clinicos/${updated.slug}`,
      origin: {
        type: "CHATGPT_MCP",
        label: "ChatGPT · MCP",
        description: "Publicado mediante la integración editorial de ChatGPT"
      }
    });
  }

  return { slug: updated.slug, status: updated.status, published_at: updated.publishedAt?.toISOString(), ...urls(updated.slug) };
}

export async function getClinicalCase(input: { slug: string }) {
  const content = await db.content.findUnique({ where: { slug: input.slug }, include: { oncologyData: true, media: { orderBy: { createdAt: "asc" } }, visualPlans: { where: { isCurrent: true }, include: { figures: { orderBy: { figureNumber: "asc" } } } } } });
  if (!content || content.type !== ContentType.CLINICAL_CASE) throw new Error("Caso clínico no encontrado.");
  return { id: content.id, slug: content.slug, status: content.status, title: content.title, summary: content.summary, body: content.body, oncology: content.oncologyData, figures: content.visualPlans[0]?.figures.map((figure) => ({ id: figure.id, figure_number: figure.figureNumber, title: figure.title, category: figure.category, prompt: figure.optimizedPrompt, placement: figure.placement, placement_anchor: figure.placementAnchor, status: figure.status, is_featured: figure.isFeatured })) || [], media: content.media.map((asset) => ({ id: asset.id, title: asset.title, image_url: asset.storagePath, alt_text: asset.altText, is_featured: asset.isFeatured, figure_id: asset.figureId })), ...urls(content.slug) };
}
