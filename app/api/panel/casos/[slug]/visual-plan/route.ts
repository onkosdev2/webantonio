import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { buildCaseVisualPlan } from "@/lib/ai/visual-pipeline/orchestrator";
import { getEditorialQualityReview } from "@/lib/ai/visual-pipeline/presentation";

export const maxDuration = 900;

function serialize(plan: NonNullable<Awaited<ReturnType<typeof buildCaseVisualPlan>>>) {
  return {
    id: plan.id,
    status: plan.status,
    currentStage: plan.currentStage,
    qualityScore: plan.qualityScore,
    error: plan.error,
    qualityReview: getEditorialQualityReview(plan.sharedState),
    figures: plan.figures.map((figure) => ({
      id: figure.id,
      figureNumber: figure.figureNumber,
      priority: figure.priority,
      title: figure.title,
      category: figure.category,
      purpose: figure.purpose,
      educationalMessage: figure.educationalMessage,
      reason: figure.reason,
      score: figure.adjustedScore,
      optimizedPrompt: figure.optimizedPrompt,
      status: figure.status,
      isFeatured: figure.isFeatured
    }))
  };
}

async function findCase(slug: string) {
  return db.content.findUnique({
    where: { slug },
    select: { id: true, type: true }
  });
}

async function findCurrentPlan(contentId: string) {
  return db.caseVisualPlan.findFirst({
    where: { contentId, isCurrent: true },
    include: {
      figures: {
        include: { assets: true },
        orderBy: { figureNumber: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  if (!await getApiUser()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { slug } = await context.params;
  const content = await findCase(slug);
  if (!content || content.type !== "CLINICAL_CASE") {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const plan = await findCurrentPlan(content.id);
  return NextResponse.json(
    { plan: plan ? serialize(plan) : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(_: Request, context: { params: Promise<{ slug: string }> }) {
  if (!await getApiUser()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { slug } = await context.params;
  const content = await findCase(slug);
  if (!content || content.type !== "CLINICAL_CASE") {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }
  try {
    const plan = await buildCaseVisualPlan(content.id, { force: true });
    if (!plan) throw new Error("No se pudo recuperar el plan generado.");
    return NextResponse.json({ plan: serialize(plan) });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "No se pudo actualizar el plan visual."
    }, { status: 500 });
  }
}
