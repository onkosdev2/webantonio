import { createHash } from "node:crypto";
import { FigureStatus, Prisma, VisualPlanStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { OPENAI_TEXT_MODEL, requestStructuredOpenAi } from "@/lib/ai/openai-text";
import {
  findPersonalIdentifierRisks,
  personalIdentifierMessage
} from "@/lib/ai/privacy";
import {
  compliancePackageSchema,
  diseaseKnowledgeSchema,
  editorialPlanSchema,
  editorialQualitySchema,
  figureReasoningSchema,
  medicalCaseAnalysisSchema,
  pipelineJsonSchemas,
  promptPackageSchema,
  type FigureCandidate
} from "@/lib/ai/visual-pipeline/contracts";

export const FIGURE_POLICY = {
  version: "figure-policy.v1",
  minimum: 3,
  maximum: 5,
  target: 4,
  defaultCount: 3,
  additionalMinScore: 90,
  maximumRedundancy: 0.7
} as const;

type SharedState = Record<string, unknown>;

function sourceHash(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function assertCaseMayBeSentToAi(input: { anonymized: boolean; body: string }) {
  if (!input.anonymized) {
    throw new Error("Confirma la anonimización antes de enviar el caso a OpenAI.");
  }

  const risks = findPersonalIdentifierRisks(input.body);
  if (risks.length > 0) {
    throw new Error(personalIdentifierMessage(risks));
  }
}

function normalizedScore(candidate: FigureCandidate) {
  const breakdown = candidate.score_breakdown;
  return Math.min(100, Math.max(0,
    breakdown.case_relevance +
    breakdown.diagnostic_value +
    breakdown.educational_value +
    breakdown.case_specificity
  ));
}

function applyEditorialPolicy(
  candidates: FigureCandidate[],
  plan: { ordered_candidate_ids: string[]; redundancies: Array<{ candidate_ids: string[]; keep_candidate_id: string; overlap_score: number }>; featured_candidate_id: string }
) {
  const normalized = candidates.map((candidate) => ({
    ...candidate,
    score: normalizedScore(candidate)
  }));
  const blocked = new Set<string>();
  for (const redundancy of plan.redundancies) {
    if (redundancy.overlap_score < FIGURE_POLICY.maximumRedundancy) continue;
    for (const id of redundancy.candidate_ids) {
      if (id !== redundancy.keep_candidate_id) blocked.add(id);
    }
  }

  const byScore = [...normalized].sort((a, b) => b.score - a.score);
  let eligible = byScore.filter((candidate) => !blocked.has(candidate.candidate_id));
  if (eligible.length < FIGURE_POLICY.minimum) eligible = byScore;

  const selected = eligible.slice(0, FIGURE_POLICY.minimum);
  for (const candidate of eligible.slice(FIGURE_POLICY.minimum)) {
    if (selected.length >= FIGURE_POLICY.maximum) break;
    if (candidate.score > FIGURE_POLICY.additionalMinScore) selected.push(candidate);
  }

  const selectedIds = new Set(selected.map((item) => item.candidate_id));
  const narrative = plan.ordered_candidate_ids
    .map((id) => selected.find((item) => item.candidate_id === id))
    .filter((item): item is FigureCandidate => Boolean(item));
  for (const candidate of selected) {
    if (!narrative.some((item) => item.candidate_id === candidate.candidate_id)) narrative.push(candidate);
  }
  const featuredId = selectedIds.has(plan.featured_candidate_id)
    ? plan.featured_candidate_id
    : narrative[0]?.candidate_id;
  return { figures: narrative.slice(0, FIGURE_POLICY.maximum), featuredId };
}

async function saveStage(planId: string, status: VisualPlanStatus, stage: string, sharedState: SharedState) {
  await db.caseVisualPlan.update({
    where: { id: planId },
    data: {
      status,
      currentStage: stage,
      sharedState: sharedState as Prisma.InputJsonValue,
      error: null
    }
  });
}

export async function buildCaseVisualPlan(contentId: string, options: { force?: boolean } = {}) {
  const content = await db.content.findUnique({
    where: { id: contentId },
    include: { oncologyData: true }
  });
  if (!content || content.type !== "CLINICAL_CASE") throw new Error("Caso clínico no encontrado.");
  assertCaseMayBeSentToAi({
    anonymized: content.oncologyData?.anonymized ?? false,
    body: content.body
  });

  const caseInput = {
    title: content.title,
    summary: content.summary,
    body: content.body,
    tumor_type: content.oncologyData?.tumorType ?? null,
    stage: content.oncologyData?.stage ?? null,
    biomarkers: content.oncologyData?.biomarkers ?? [],
    treatment_line: content.oncologyData?.treatmentLine ?? null,
    treatment_plan: content.oncologyData?.treatmentPlan ?? null,
    response: content.oncologyData?.response ?? null,
    toxicities: content.oncologyData?.toxicities ?? [],
    evidence_level: content.oncologyData?.evidenceLevel ?? null
  };
  const hash = sourceHash(caseInput);
  const current = await db.caseVisualPlan.findFirst({
    where: { contentId, isCurrent: true },
    include: { figures: true },
    orderBy: { createdAt: "desc" }
  });
  if (!options.force && current?.sourceHash === hash && current.status === "READY") return current;

  await db.caseVisualPlan.updateMany({
    where: { contentId, isCurrent: true },
    data: { isCurrent: false, status: VisualPlanStatus.STALE }
  });
  const visualPlan = await db.caseVisualPlan.create({
    data: {
      contentId,
      sourceHash: hash,
      policyVersion: FIGURE_POLICY.version,
      model: OPENAI_TEXT_MODEL,
      sharedState: {
        schema_version: "onkos.visual-pipeline.v2",
        policy_version: FIGURE_POLICY.version,
        case_id: contentId,
        source_hash: hash
      }
    }
  });
  const shared: SharedState = {
    schema_version: "onkos.visual-pipeline.v2",
    policy_version: FIGURE_POLICY.version,
    case_id: contentId,
    source_hash: hash
  };

  try {
    await saveStage(visualPlan.id, VisualPlanStatus.ANALYZING, "medical_case_analyzer", shared);
    const analysis = await requestStructuredOpenAi({
      name: "medical_case_analysis_v1",
      schema: medicalCaseAnalysisSchema,
      jsonSchema: pipelineJsonSchemas.medicalCaseAnalysis,
      reasoning: "medium",
      instructions: [
        "You are a senior physician with expertise in oncology, pathology, radiology and evidence-based medicine.",
        "Extract only facts explicitly supported by the provided case. Do not summarize, create prompts, recommend figures, or invent information.",
        "Use null for missing scalar information and empty arrays for missing lists."
      ].join(" "),
      input: JSON.stringify(caseInput)
    });
    shared.case_analysis = analysis.data;

    await saveStage(visualPlan.id, VisualPlanStatus.RETRIEVING, "disease_knowledge_retriever", shared);
    const knowledge = await requestStructuredOpenAi({
      name: "disease_knowledge_v1",
      schema: diseaseKnowledgeSchema,
      jsonSchema: pipelineJsonSchemas.diseaseKnowledge,
      reasoning: "low",
      tools: [{ type: "web_search" }],
      instructions: [
        "You are a medical knowledge retriever. Do not analyze the patient case, decide figures, or generate prompts.",
        "Retrieve concise disease knowledge using diagnosis, stage and histology only.",
        "Prefer authoritative institutional medical sources. Never invent a source URL.",
        "Use grounded only when at least one verifiable source URL is available; otherwise use model_knowledge or insufficient_evidence."
      ].join(" "),
      input: JSON.stringify({
        diagnosis: analysis.data.diagnosis,
        stage: analysis.data.stage,
        histology: analysis.data.histology
      })
    });
    const knowledgeData = {
      ...knowledge.data,
      evidence_status: knowledge.data.sources.some((source) => source.url)
        ? knowledge.data.evidence_status
        : "model_knowledge"
    };
    shared.disease_knowledge = knowledgeData;

    await saveStage(visualPlan.id, VisualPlanStatus.REASONING, "clinical_figure_reasoner", shared);
    const reasoning = await requestStructuredOpenAi({
      name: "clinical_figure_reasoning_v1",
      schema: figureReasoningSchema,
      jsonSchema: pipelineJsonSchemas.figureReasoning,
      reasoning: "medium",
      instructions: [
        "You are the clinical figure reasoner for a medical journal.",
        "Decide which figures this specific case needs. Do not write image prompts.",
        "Your objective is not to maximize figure count. Maximize educational value with the smallest possible number.",
        "Recommend 3 to 5 candidates, default to 3, and never exceed 5.",
        "A fourth or fifth candidate requires significant non-redundant value.",
        "Score case relevance 0-40, diagnostic value 0-25, educational value 0-20, and case specificity 0-15. The total is the score.",
        "Support every candidate with explicit paths or concise facts from the case analysis or disease knowledge."
      ].join(" "),
      input: JSON.stringify({ case: caseInput, ...shared })
    });
    shared.recommended_figures = reasoning.data.recommended_figures;

    await saveStage(visualPlan.id, VisualPlanStatus.PLANNING, "figure_editorial_planner", shared);
    const editorial = await requestStructuredOpenAi({
      name: "figure_editorial_plan_v1",
      schema: editorialPlanSchema,
      jsonSchema: pipelineJsonSchemas.editorialPlan,
      reasoning: "medium",
      instructions: [
        "You are the figure editor of a high-impact medical journal.",
        "Do not invent new major figures and do not write prompts.",
        "Order candidates into a coherent clinical narrative, identify redundancy, and recommend a cover from the candidates.",
        "Priority 1 is mandatory, priority 2 strongly recommended, priority 3 optional.",
        "When two figures teach similar information, keep only the one with higher educational value.",
        "The application enforces the final 3-5 limit deterministically."
      ].join(" "),
      input: JSON.stringify(shared)
    });
    const policyResult = applyEditorialPolicy(reasoning.data.recommended_figures, editorial.data);
    shared.editorial_plan = {
      ...editorial.data,
      selected_candidate_ids: policyResult.figures.map((item) => item.candidate_id),
      featured_candidate_id: policyResult.featuredId,
      applied_policy: FIGURE_POLICY
    };

    await saveStage(visualPlan.id, VisualPlanStatus.PROMPTING, "prompt_engineering_specialist", shared);
    const prompts = await requestStructuredOpenAi({
      name: "medical_image_prompts_v1",
      schema: promptPackageSchema,
      jsonSchema: pipelineJsonSchemas.promptPackage,
      reasoning: "low",
      instructions: [
        "You are a specialist medical image prompt engineer.",
        "Write one prompt for each approved figure and no others.",
        "Maximize scientific realism, educational usefulness, clinical accuracy, patient dignity and generation success.",
        "Use professional terminology, calm non-sensational language, no text, no logos and no identifying patient information.",
        "For synthetic radiology or pathology, describe an educational reference image rather than a real patient record."
      ].join(" "),
      input: JSON.stringify({
        case_analysis: analysis.data,
        disease_knowledge: knowledgeData,
        editorial_plan: shared.editorial_plan,
        figures: policyResult.figures
      })
    });
    shared.image_prompts = prompts.data.prompts;

    await saveStage(visualPlan.id, VisualPlanStatus.COMPLIANCE_REVIEW, "medical_prompt_compliance", shared);
    const compliance = await requestStructuredOpenAi({
      name: "medical_prompt_compliance_v1",
      schema: compliancePackageSchema,
      jsonSchema: pipelineJsonSchemas.compliancePackage,
      reasoning: "low",
      instructions: [
        "You are a medical image compliance and quality reviewer.",
        "Preserve all supported medical meaning while removing unsupported findings, identifying information, sensational language and wording that unnecessarily triggers safety filters.",
        "Do not add findings or change the figure purpose. Return an optimized prompt for every approved figure."
      ].join(" "),
      input: JSON.stringify({ case_analysis: analysis.data, figures: policyResult.figures, prompts: prompts.data.prompts })
    });
    shared.medical_compliance = compliance.data;

    await saveStage(visualPlan.id, VisualPlanStatus.QUALITY_REVIEW, "editorial_quality_reviewer", shared);
    const quality = await requestStructuredOpenAi({
      name: "editorial_quality_review_v1",
      schema: editorialQualitySchema,
      jsonSchema: pipelineJsonSchemas.editorialQuality,
      reasoning: "medium",
      instructions: [
        "You are the editorial quality reviewer of a medical journal.",
        "Do not rewrite prompts or add figures. Evaluate educational value, case relevance, coverage, diversity, narrative order, redundancy, prompt correspondence and the 3-5 figure policy.",
        "Approve only when the package is coherent, non-redundant and safe for editorial review."
      ].join(" "),
      input: JSON.stringify({ ...shared, figures: policyResult.figures })
    });
    shared.editorial_quality_review = quality.data;

    const promptById = new Map(prompts.data.prompts.map((item) => [item.candidate_id, item.prompt]));
    const complianceById = new Map(compliance.data.prompts.map((item) => [item.candidate_id, item]));
    const complianceReady = policyResult.figures.every(
      (figure) => complianceById.get(figure.candidate_id)?.compliance_status === "approved"
    );
    const generationReady =
      policyResult.figures.length >= FIGURE_POLICY.minimum &&
      policyResult.figures.length <= FIGURE_POLICY.maximum &&
      complianceReady;
    const hasEditorialAdvisories =
      !quality.data.approved ||
      !quality.data.figure_count_valid ||
      !quality.data.diversity_valid ||
      !quality.data.narrative_valid;
    shared.generation_readiness = {
      ready: generationReady,
      compliance_ready: complianceReady,
      editorial_review_approved: quality.data.approved,
      advisory_only: generationReady && hasEditorialAdvisories
    };
    await db.$transaction([
      ...policyResult.figures.map((figure, index) => {
        const reviewed = complianceById.get(figure.candidate_id);
        const score = normalizedScore(figure);
        return db.caseFigure.create({
          data: {
            planId: visualPlan.id,
            figureNumber: index + 1,
            priority: score >= 90 ? 1 : score >= 80 ? 2 : 3,
            title: figure.title,
            category: figure.category,
            purpose: figure.purpose,
            educationalMessage: figure.educational_message,
            reason: figure.reason,
            score,
            adjustedScore: score,
            scoreBreakdown: figure.score_breakdown,
            supportedFacts: figure.supported_case_facts,
            supportedKnowledge: figure.supported_knowledge,
            recommendedVisualStyle: figure.recommended_visual_style,
            estimatedDifficulty: figure.estimated_difficulty,
            draftPrompt: promptById.get(figure.candidate_id) ?? null,
            optimizedPrompt: reviewed?.optimized_prompt ?? promptById.get(figure.candidate_id) ?? null,
            compliance: reviewed ?? {},
            status: reviewed?.compliance_status === "approved" ? FigureStatus.READY : FigureStatus.PLANNED,
            isFeatured: figure.candidate_id === policyResult.featuredId
          }
        });
      }),
      db.caseVisualPlan.update({
        where: { id: visualPlan.id },
        data: {
          status: generationReady ? VisualPlanStatus.READY : VisualPlanStatus.REQUIRES_REVIEW,
          currentStage: "complete",
          sharedState: shared as Prisma.InputJsonValue,
          qualityScore: quality.data.overall_score,
          error: null
        }
      })
    ]);
  } catch (error) {
    await db.caseVisualPlan.update({
      where: { id: visualPlan.id },
      data: {
        status: VisualPlanStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 1500) : "Fallo desconocido del pipeline visual"
      }
    });
  }

  return db.caseVisualPlan.findUnique({
    where: { id: visualPlan.id },
    include: { figures: { include: { assets: true }, orderBy: { figureNumber: "asc" } } }
  });
}

export async function markVisualPlanStale(contentId: string) {
  await db.caseVisualPlan.updateMany({
    where: { contentId, isCurrent: true, status: { not: VisualPlanStatus.FAILED } },
    data: { status: VisualPlanStatus.STALE }
  });
  await db.caseFigure.updateMany({
    where: { plan: { contentId, isCurrent: true } },
    data: { status: FigureStatus.STALE }
  });
}
