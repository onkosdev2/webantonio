"use server";

import { AiTaskKind, AiTaskState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateDraftWithGlm } from "@/lib/ai/glm";
import { createDraftViaMcp, queueDraftForReview } from "@/lib/mcp/server";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePieceType(value: string) {
  if (
    value === "editorial" ||
    value === "research" ||
    value === "reflection" ||
    value === "story" ||
    value === "clinical_case"
  ) {
    return value;
  }

  return "news_item";
}

function resolveTaskKind(pieceType: ReturnType<typeof parsePieceType>) {
  if (pieceType === "news_item") {
    return AiTaskKind.NEWS_DRAFT;
  }

  if (pieceType === "clinical_case") {
    return AiTaskKind.CASE_ENRICHMENT;
  }

  return AiTaskKind.EDITORIAL_DRAFT;
}

function resolvePieceLabel(pieceType: ReturnType<typeof parsePieceType>) {
  switch (pieceType) {
    case "editorial":
      return "Editorial";
    case "research":
      return "Investigación";
    case "reflection":
      return "Reflexión";
    case "story":
      return "Historia";
    case "clinical_case":
      return "Caso clínico";
    default:
      return "Noticia";
  }
}

function buildEditorialPrompt({
  pieceType,
  focus,
  topic,
  angle,
  goal,
  tone,
  length,
  notes
}: {
  pieceType: string;
  focus: string;
  topic: string;
  angle: string;
  goal: string;
  tone: string;
  length: string;
  notes: string;
}) {
  return (
    `Tipo de pieza: ${pieceType}\n` +
    `Área oncológica: ${focus}\n` +
    `Tema propuesto por el Dr. Camargo: ${topic}\n` +
    `Ángulo: ${angle}\n` +
    `Objetivo: ${goal}\n` +
    `Tono: ${tone}\n` +
    `Longitud deseada: ${length}\n\n` +
    `Claves obligatorias:\n${notes}`
  );
}

export async function createAiTaskAction(formData: FormData) {
  const pieceType = parsePieceType(getText(formData, "pieceType"));
  const kind = resolveTaskKind(pieceType);
  const focus = getText(formData, "focus");
  const topic = getText(formData, "topic");
  const angle = getText(formData, "angle");
  const goal = getText(formData, "goal");
  const tone = getText(formData, "tone");
  const length = getText(formData, "length");
  const notes = getText(formData, "notes");
  const prompt = buildEditorialPrompt({
    pieceType,
    focus,
    topic,
    angle,
    goal,
    tone,
    length,
    notes
  });
  const generated = await generateDraftWithGlm({
    kind: pieceType,
    focus,
    topic,
    angle,
    goal,
    tone,
    length,
    notes
  });

  const draftType = pieceType;
  const draftTags = [
    "ia",
    generated.generationMode === "glm" ? "ai_glm" : "ai_fallback",
    focus,
    angle,
    goal,
    pieceType
  ];

  if (pieceType === "research") {
    draftTags.push("investigacion", "research");
  }

  const created = await createDraftViaMcp({
    type: draftType,
    title: generated.title,
    summary: generated.summary,
    body: generated.body,
    source: "ia_interna",
    tags: draftTags,
    status: "draft",
    tumorType: pieceType === "clinical_case" || pieceType === "news_item" ? focus : undefined
  });

  const queued = await queueDraftForReview(created.slug);

  await db.aiTask.create({
    data: {
      kind,
      state: AiTaskState.READY,
      title: `${resolvePieceLabel(pieceType)} · ${topic}`,
      prompt,
      resultTitle: queued.title,
      resultNote:
        `Motor: ${generated.generationMode === "glm" ? "GLM 5.1" : "fallback local"}. ` +
        `Borrador redactado con ángulo "${angle}", objetivo "${goal}" y tono "${tone}". ` +
        (generated.fallbackReason
          ? `Motivo del fallback: ${generated.fallbackReason}. `
          : "") +
        "Quedó listo para revisión editorial.",
      contentId: queued.id
    }
  });

  revalidatePath("/panel/cola-ia");
  redirect("/panel/cola-ia");
}
