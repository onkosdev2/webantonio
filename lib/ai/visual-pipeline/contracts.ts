import { z } from "zod";

const nullableText = z.string().nullable();
const textList = z.array(z.string());

export const medicalCaseAnalysisSchema = z.object({
  diagnosis: nullableText,
  histology: nullableText,
  stage: nullableText,
  metastases: textList,
  symptoms: textList,
  timeline: textList,
  diagnostic_studies: textList,
  pathology_findings: textList,
  imaging_findings: textList,
  treatments: textList,
  treatment_response: nullableText,
  disease_progression: nullableText,
  complications: textList,
  neurological_findings: textList,
  laboratory_findings: textList,
  procedures: textList,
  differential_diagnoses: textList,
  educational_relevance: textList,
  learning_points: textList
});

export const diseaseKnowledgeSchema = z.object({
  disease: z.string(),
  common_imaging: textList,
  common_pathology: textList,
  common_followup: textList,
  possible_complications: textList,
  sources: z.array(z.object({
    title: z.string(),
    organization: z.string(),
    url: nullableText,
    published_at: nullableText
  })),
  evidence_status: z.enum(["grounded", "model_knowledge", "insufficient_evidence"])
});

export const figureCandidateSchema = z.object({
  candidate_id: z.string(),
  category: z.string(),
  title: z.string(),
  purpose: z.string(),
  educational_message: z.string(),
  reason: z.string(),
  score: z.number().int().min(0).max(100),
  priority: z.number().int().min(1).max(3),
  score_breakdown: z.object({
    case_relevance: z.number().int().min(0).max(40),
    diagnostic_value: z.number().int().min(0).max(25),
    educational_value: z.number().int().min(0).max(20),
    case_specificity: z.number().int().min(0).max(15)
  }),
  supported_case_facts: textList,
  supported_knowledge: textList,
  recommended_visual_style: z.string(),
  estimated_difficulty: z.enum(["low", "medium", "high"])
});

export const figureReasoningSchema = z.object({
  recommended_figures: z.array(figureCandidateSchema).min(3).max(5)
});

export const editorialPlanSchema = z.object({
  ordered_candidate_ids: z.array(z.string()).min(3).max(5),
  redundancies: z.array(z.object({
    candidate_ids: z.array(z.string()).min(2),
    keep_candidate_id: z.string(),
    reason: z.string(),
    overlap_score: z.number().min(0).max(1)
  })),
  featured_candidate_id: z.string(),
  missing_minor_figure: z.object({
    needed: z.boolean(),
    reason: nullableText
  })
});

export const promptPackageSchema = z.object({
  prompts: z.array(z.object({
    candidate_id: z.string(),
    prompt: z.string().min(80)
  })).min(3).max(5)
});

export const compliancePackageSchema = z.object({
  prompts: z.array(z.object({
    candidate_id: z.string(),
    optimized_prompt: z.string().min(80),
    medical_meaning_preserved: z.boolean(),
    unsupported_findings: textList,
    changes: textList,
    compliance_status: z.enum(["approved", "requires_review"])
  })).min(3).max(5)
});

export const editorialQualitySchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  approved: z.boolean(),
  coverage: z.object({
    diagnosis: z.boolean(),
    pathology: z.boolean(),
    radiology: z.boolean(),
    treatment: z.boolean(),
    timeline: z.boolean()
  }),
  figure_count_valid: z.boolean(),
  diversity_valid: z.boolean(),
  narrative_valid: z.boolean(),
  redundancies: textList,
  missing_figures: textList,
  recommendations: textList
});

export type MedicalCaseAnalysis = z.infer<typeof medicalCaseAnalysisSchema>;
export type DiseaseKnowledge = z.infer<typeof diseaseKnowledgeSchema>;
export type FigureCandidate = z.infer<typeof figureCandidateSchema>;
export type FigureReasoning = z.infer<typeof figureReasoningSchema>;
export type EditorialPlan = z.infer<typeof editorialPlanSchema>;
export type PromptPackage = z.infer<typeof promptPackageSchema>;
export type CompliancePackage = z.infer<typeof compliancePackageSchema>;
export type EditorialQuality = z.infer<typeof editorialQualitySchema>;

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const strings = { type: "array", items: { type: "string" } } as const;

export const pipelineJsonSchemas = {
  medicalCaseAnalysis: {
    type: "object", additionalProperties: false,
    required: ["diagnosis", "histology", "stage", "metastases", "symptoms", "timeline", "diagnostic_studies", "pathology_findings", "imaging_findings", "treatments", "treatment_response", "disease_progression", "complications", "neurological_findings", "laboratory_findings", "procedures", "differential_diagnoses", "educational_relevance", "learning_points"],
    properties: {
      diagnosis: nullableString, histology: nullableString, stage: nullableString,
      metastases: strings, symptoms: strings, timeline: strings, diagnostic_studies: strings,
      pathology_findings: strings, imaging_findings: strings, treatments: strings,
      treatment_response: nullableString, disease_progression: nullableString,
      complications: strings, neurological_findings: strings, laboratory_findings: strings,
      procedures: strings, differential_diagnoses: strings, educational_relevance: strings,
      learning_points: strings
    }
  },
  diseaseKnowledge: {
    type: "object", additionalProperties: false,
    required: ["disease", "common_imaging", "common_pathology", "common_followup", "possible_complications", "sources", "evidence_status"],
    properties: {
      disease: { type: "string" }, common_imaging: strings, common_pathology: strings,
      common_followup: strings, possible_complications: strings,
      sources: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "organization", "url", "published_at"], properties: { title: { type: "string" }, organization: { type: "string" }, url: nullableString, published_at: nullableString } } },
      evidence_status: { type: "string", enum: ["grounded", "model_knowledge", "insufficient_evidence"] }
    }
  },
  figureReasoning: {
    type: "object", additionalProperties: false, required: ["recommended_figures"],
    properties: { recommended_figures: { type: "array", minItems: 3, maxItems: 5, items: {
      type: "object", additionalProperties: false,
      required: ["candidate_id", "category", "title", "purpose", "educational_message", "reason", "score", "priority", "score_breakdown", "supported_case_facts", "supported_knowledge", "recommended_visual_style", "estimated_difficulty"],
      properties: {
        candidate_id: { type: "string" }, category: { type: "string" }, title: { type: "string" }, purpose: { type: "string" }, educational_message: { type: "string" }, reason: { type: "string" },
        score: { type: "integer", minimum: 0, maximum: 100 }, priority: { type: "integer", minimum: 1, maximum: 3 },
        score_breakdown: { type: "object", additionalProperties: false, required: ["case_relevance", "diagnostic_value", "educational_value", "case_specificity"], properties: { case_relevance: { type: "integer", minimum: 0, maximum: 40 }, diagnostic_value: { type: "integer", minimum: 0, maximum: 25 }, educational_value: { type: "integer", minimum: 0, maximum: 20 }, case_specificity: { type: "integer", minimum: 0, maximum: 15 } } },
        supported_case_facts: strings, supported_knowledge: strings, recommended_visual_style: { type: "string" }, estimated_difficulty: { type: "string", enum: ["low", "medium", "high"] }
      }
    } } }
  },
  editorialPlan: {
    type: "object", additionalProperties: false,
    required: ["ordered_candidate_ids", "redundancies", "featured_candidate_id", "missing_minor_figure"],
    properties: {
      ordered_candidate_ids: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
      redundancies: { type: "array", items: { type: "object", additionalProperties: false, required: ["candidate_ids", "keep_candidate_id", "reason", "overlap_score"], properties: { candidate_ids: { type: "array", minItems: 2, items: { type: "string" } }, keep_candidate_id: { type: "string" }, reason: { type: "string" }, overlap_score: { type: "number", minimum: 0, maximum: 1 } } } },
      featured_candidate_id: { type: "string" },
      missing_minor_figure: { type: "object", additionalProperties: false, required: ["needed", "reason"], properties: { needed: { type: "boolean" }, reason: nullableString } }
    }
  },
  promptPackage: {
    type: "object", additionalProperties: false, required: ["prompts"],
    properties: { prompts: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["candidate_id", "prompt"], properties: { candidate_id: { type: "string" }, prompt: { type: "string" } } } } }
  },
  compliancePackage: {
    type: "object", additionalProperties: false, required: ["prompts"],
    properties: { prompts: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["candidate_id", "optimized_prompt", "medical_meaning_preserved", "unsupported_findings", "changes", "compliance_status"], properties: { candidate_id: { type: "string" }, optimized_prompt: { type: "string" }, medical_meaning_preserved: { type: "boolean" }, unsupported_findings: strings, changes: strings, compliance_status: { type: "string", enum: ["approved", "requires_review"] } } } } }
  },
  editorialQuality: {
    type: "object", additionalProperties: false,
    required: ["overall_score", "approved", "coverage", "figure_count_valid", "diversity_valid", "narrative_valid", "redundancies", "missing_figures", "recommendations"],
    properties: {
      overall_score: { type: "integer", minimum: 0, maximum: 100 }, approved: { type: "boolean" },
      coverage: { type: "object", additionalProperties: false, required: ["diagnosis", "pathology", "radiology", "treatment", "timeline"], properties: { diagnosis: { type: "boolean" }, pathology: { type: "boolean" }, radiology: { type: "boolean" }, treatment: { type: "boolean" }, timeline: { type: "boolean" } } },
      figure_count_valid: { type: "boolean" }, diversity_valid: { type: "boolean" }, narrative_valid: { type: "boolean" }, redundancies: strings, missing_figures: strings, recommendations: strings
    }
  }
} as const;
