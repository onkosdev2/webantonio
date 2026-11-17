import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/auth/session";
import {
  generateCaseImages,
  type ImageAspectRatio
} from "@/lib/ai/nvidia-images";
import { logRuntimeEvent, startMemoryMonitor, trackRuntimeOperation } from "@/lib/observability/runtime-events";

export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  startMemoryMonitor();
  if (!await getApiUser()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { slug } = await context.params;
  const body = await request.json().catch(() => ({})) as {
    tone?: string;
    figureId?: string;
    promptOverride?: string;
    aspectRatio?: string;
    provider?: string;
  };
  const aspectRatio: ImageAspectRatio = body.aspectRatio === "4:3" ? "4:3" : "16:9";
  if (typeof body.figureId !== "string" || !body.figureId) {
    return NextResponse.json({ error: "Selecciona una figura del plan visual." }, { status: 400 });
  }

  const item = await db.content.findUnique({ where: { slug }, include: { oncologyData: true } });
  if (!item || item.type !== "CLINICAL_CASE") {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }
  const figure = await db.caseFigure.findFirst({
    where: {
      id: body.figureId,
      plan: { contentId: item.id, isCurrent: true }
    },
    include: { plan: { select: { status: true } } }
  });
  if (!figure) {
    return NextResponse.json({ error: "La figura ya no pertenece al plan visual vigente." }, { status: 409 });
  }
  if (figure.plan.status !== "READY") {
    return NextResponse.json({ error: "El plan visual debe estar aprobado antes de generar imágenes." }, { status: 409 });
  }
  const prompt = body.promptOverride?.trim() || figure.optimizedPrompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "La figura todavía no tiene un prompt aprobado." }, { status: 409 });
  }

  try {
    const provider = body.provider === "nvidia" || body.provider === "comfyui" ? body.provider : "openai";
    const operationStartedAt = Date.now();
    logRuntimeEvent({ event: "operation_start", operation: "generate_case_images_http", provider, aspectRatio });
    await db.caseFigure.update({
      where: { id: figure.id },
      data: {
        status: "GENERATING",
        ...(body.promptOverride?.trim() ? { optimizedPrompt: prompt } : {})
      }
    });
    const generated = await trackRuntimeOperation("generate_case_images", () => generateCaseImages({
      title: item.title,
      summary: item.summary,
      body: item.body,
      tumorType: item.oncologyData?.tumorType ?? "",
      stage: item.oncologyData?.stage ?? "",
      biomarkers: Array.isArray(item.oncologyData?.biomarkers)
        ? item.oncologyData.biomarkers.filter((value): value is string => typeof value === "string")
        : [],
      treatmentLine: item.oncologyData?.treatmentLine ?? "",
      treatmentPlan: item.oncologyData?.treatmentPlan ?? "",
      evidenceLevel: item.oncologyData?.evidenceLevel ?? "",
      tone: body.tone ?? "docente",
      aspectRatio,
      promptOverride: prompt,
      provider
    }), { provider, aspectRatio });
    const assets = await db.$transaction(generated.map((image) => db.mediaAsset.create({
      data: {
        contentId: item.id,
        figureId: figure.id,
        title: `Figura ${figure.figureNumber} · ${figure.title}`,
        altText: `${figure.educationalMessage}. Imagen educativa generada por IA; no corresponde a un estudio diagnóstico real.`,
        storagePath: image.url,
        mediaType: "image",
        origin: image.origin,
        prompt: image.prompt,
        model: image.model
      }
    })));
    await db.caseFigure.update({ where: { id: figure.id }, data: { status: "GENERATED" } });
    logRuntimeEvent({
      event: "operation_end",
      operation: "generate_case_images_http",
      outcome: "ok",
      provider,
      aspectRatio,
      durationMs: Date.now() - operationStartedAt
    });
    return NextResponse.json({ assets });
  } catch (error) {
    logRuntimeEvent({
      event: "operation_end",
      operation: "generate_case_images_http",
      outcome: "error",
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    await db.caseFigure.update({ where: { id: figure.id }, data: { status: "FAILED" } }).catch(() => undefined);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "No se pudo generar la imagen."
    }, { status: 500 });
  }
}
