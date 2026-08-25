import { z } from "zod";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "gpt-5.6-sol";

type ReasoningEffort = "none" | "low" | "medium" | "high";

type StructuredRequest<T> = {
  name: string;
  instructions: string;
  input: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  reasoning?: ReasoningEffort;
  tools?: Array<Record<string, unknown>>;
};

function extractResponseText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
}) {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? item.refusal ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function openAiTextError(status: number, message?: string) {
  if (status === 401 || status === 403) {
    return "OpenAI rechazó OPENAI_API_KEY. Revisa la credencial y reinicia el proyecto.";
  }
  if (status === 429) {
    return "OpenAI alcanzó el límite de uso o solicitudes. Revisa el crédito disponible.";
  }
  return message || `OpenAI no pudo completar la etapa (${status}).`;
}

async function createResponse(body: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240_000)
  });
  const payload = await response.json() as {
    id?: string;
    model?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
    usage?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(openAiTextError(response.status, payload.error?.message));
  }
  return payload;
}

export async function requestStructuredOpenAi<T>(request: StructuredRequest<T>) {
  let validationError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const payload = await createResponse({
      model: OPENAI_TEXT_MODEL,
      instructions: request.instructions,
      input:
        attempt === 0
          ? request.input
          : `${request.input}\n\nThe previous response failed schema validation: ${validationError}. Return a corrected response only.`,
      reasoning: { effort: request.reasoning ?? "low" },
      ...(request.tools?.length ? { tools: request.tools } : {}),
      text: {
        format: {
          type: "json_schema",
          name: request.name,
          strict: true,
          schema: request.jsonSchema
        },
        verbosity: "low"
      }
    });
    const text = extractResponseText(payload);
    if (!text) throw new Error(`OpenAI devolvió una respuesta vacía en ${request.name}.`);
    try {
      const parsed = request.schema.parse(JSON.parse(text));
      return {
        data: parsed,
        responseId: payload.id ?? null,
        model: payload.model ?? OPENAI_TEXT_MODEL,
        usage: payload.usage ?? null
      };
    } catch (error) {
      validationError = error instanceof Error ? error.message.slice(0, 700) : "JSON inválido";
    }
  }
  throw new Error(`OpenAI no produjo una salida válida para ${request.name}: ${validationError}`);
}

const draftSchema = z.object({
  title: z.string().min(4),
  summary: z.string().min(20),
  body: z.string().min(80)
});

const draftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "body"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" }
  }
};

export async function generateClinicalCaseWithOpenAi(input: {
  title: string;
  summary: string;
  body: string;
  metadata: string;
  tone: string;
}) {
  const result = await requestStructuredOpenAi({
    name: "clinical_case_draft_v1",
    schema: draftSchema,
    jsonSchema: draftJsonSchema,
    reasoning: "medium",
    instructions: [
      "You are a senior oncology medical editor writing in Spanish.",
      "Create a rigorous, humane, publication-ready clinical case.",
      "Never invent patient facts, tests, treatments, outcomes, citations, or identifying information.",
      "Preserve uncertainty and missing information explicitly.",
      "Use clear section headings in the body and return only the requested structured output."
    ].join(" "),
    input: JSON.stringify(input)
  });
  return { ...result.data, generationMode: "openai" as const, model: result.model };
}

export async function refineClinicalCaseWithOpenAi(input: {
  title: string;
  summary: string;
  body: string;
  operation: "regenerate" | "expand" | "shorten" | "retone";
  targetTone?: string;
}) {
  const result = await requestStructuredOpenAi({
    name: "clinical_case_refinement_v1",
    schema: draftSchema,
    jsonSchema: draftJsonSchema,
    reasoning: "medium",
    instructions: [
      "You are a senior oncology medical editor writing in Spanish.",
      "Apply only the requested editorial operation while preserving every supported medical fact.",
      "Never add new diagnoses, findings, treatments, outcomes, citations, or patient identifiers.",
      "Return only the requested structured output."
    ].join(" "),
    input: JSON.stringify(input)
  });
  return { ...result.data, generationMode: "openai" as const, model: result.model };
}
