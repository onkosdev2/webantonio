type DraftKind =
  | "editorial"
  | "news_item"
  | "reflection"
  | "story"
  | "clinical_case";

type GlmDraftInput = {
  kind: DraftKind;
  focus: string;
  topic: string;
  angle: string;
  goal: string;
  tone: string;
  length: string;
  notes: string;
};

type GlmDraftOutput = {
  title: string;
  summary: string;
  body: string;
  generationMode: "glm" | "fallback";
  fallbackReason?: string;
};

type GlmRefineInput = {
  kind: DraftKind;
  title: string;
  summary: string;
  body: string;
  operation: "regenerate" | "expand" | "shorten" | "retone";
  targetTone?: string;
};

type GlmMessageContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>;

const GLM_API_URL =
  process.env.GLM_BASE_URL ??
  "https://open.bigmodel.cn/api/paas/v4/chat/completions";

const GLM_MODEL = process.env.GLM_MODEL ?? "glm-5.1";

function fallbackDraft(input: GlmDraftInput): GlmDraftOutput {
  if (input.kind === "editorial") {
    return {
      title: `Editorial: ${input.topic}`,
      summary:
        `Borrador editorial sobre ${input.topic} con enfoque ${input.angle} ` +
        `y objetivo ${input.goal}.`,
      body:
        `Tesis principal\n\n${input.topic}\n\n` +
        `Ángulo editorial\n\n${input.angle}\n\n` +
        `Objetivo del texto\n\n${input.goal}\n\n` +
        `Contexto clinico y claves\n\n${input.notes}\n\n` +
        `Lectura del Dr. Camargo\n\n` +
        `Este borrador desarrolla una lectura ${input.tone} en torno a ${input.topic}, ` +
        `con foco en ${input.focus}, y busca ${input.goal}. Debe revisarse antes de publicación.`,
      generationMode: "fallback"
    };
  }

  if (input.kind === "reflection") {
    return {
      title: `Reflexión: ${input.topic}`,
      summary:
        `Reflexión breve sobre ${input.topic} con ángulo ${input.angle} ` +
        `y propósito ${input.goal}.`,
      body:
        `Idea central\n\n${input.topic}\n\n` +
        `Ángulo de lectura\n\n${input.angle}\n\n` +
        `Claves clínicas y humanas\n\n${input.notes}\n\n` +
        `Reflexión del Dr. Camargo\n\n` +
        `Esta pieza se plantea con foco en ${input.focus}, tono ${input.tone} y una salida ${input.length}, ` +
        `buscando ${input.goal} con un cierre claro y publicable.`,
      generationMode: "fallback"
    };
  }

  if (input.kind === "story") {
    return {
      title: `Historia clínica: ${input.topic}`,
      summary:
        `Historia narrativa sobre ${input.topic} con enfoque ${input.angle} y objetivo ${input.goal}.`,
      body:
        `Escena inicial\n\n${input.topic}\n\n` +
        `Tensión narrativa\n\n${input.notes}\n\n` +
        `Lectura clínica y humana\n\n` +
        `La historia se desarrolla con foco en ${input.focus}, tono ${input.tone} y una intención de ${input.goal}. ` +
        "Debe revisarse para afinar ritmo, matices y cierre.",
      generationMode: "fallback"
    };
  }

  if (input.kind === "clinical_case") {
    return {
      title: `Caso clínico: ${input.topic}`,
      summary:
        `Borrador de caso clínico sobre ${input.topic} con orientación ${input.angle} y objetivo ${input.goal}.`,
      body:
        `Contexto del caso\n\n${input.topic}\n\n` +
        `Enfoque clínico\n\n${input.angle}\n\n` +
        `Datos y claves que no deben faltar\n\n${input.notes}\n\n` +
        `Lectura docente\n\n` +
        `Este borrador se centra en ${input.focus}, con tono ${input.tone} y salida ${input.length}. ` +
        "Debe revisarse para completar estructura, cautelas y anonimización antes de publicar.",
      generationMode: "fallback"
    };
  }

  return {
    title: `Noticia oncológica: ${input.topic}`,
    summary:
      `Borrador de noticia comentada sobre ${input.topic}, con ángulo ${input.angle} ` +
      `y objetivo ${input.goal}.`,
    body:
      `Qué ocurrió\n\n${input.topic}\n\n` +
      `Ángulo de lectura\n\n${input.angle}\n\n` +
      `Por qué importa\n\n${input.notes}\n\n` +
      `Lectura editorial inicial\n\n` +
      `La relevancia clínica de esta novedad debe valorarse a la luz del contexto oncológico en ${input.focus}, ` +
      `con tono ${input.tone}, longitud ${input.length} y objetivo ${input.goal}.`,
    generationMode: "fallback"
  };
}

function extractJsonBlock(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  if (start >= 0) {
    return text.slice(start).trim();
  }

  return text;
}

function extractMessageText(content?: GlmMessageContent, reasoningContent?: string) {
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();

    if (joined) {
      return joined;
    }
  }

  if (typeof reasoningContent === "string" && reasoningContent.trim()) {
    return reasoningContent.trim();
  }

  return "";
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveMaxTokens(length: string) {
  switch (length) {
    case "breve":
      return 700;
    case "amplia":
      return 1400;
    default:
      return 1000;
  }
}

function fallbackRefinement(input: GlmRefineInput): GlmDraftOutput {
  if (input.operation === "shorten") {
    return {
      title: input.title,
      summary: input.summary.slice(0, 220),
      body: input.body.split("\n").slice(0, 8).join("\n"),
      generationMode: "fallback",
      fallbackReason: "ajuste local de condensación"
    };
  }

  if (input.operation === "expand") {
    return {
      title: input.title,
      summary: input.summary,
      body:
        `${input.body}\n\n` +
        "Ampliación editorial\n\n" +
        "Este tramo adicional debe revisarse para reforzar matices clínicos, contexto y cierre argumental antes de publicar.",
      generationMode: "fallback",
      fallbackReason: "ampliación local sin respuesta del modelo"
    };
  }

  if (input.operation === "retone") {
    return {
      title: input.title,
      summary: input.summary,
      body:
        `${input.body}\n\n` +
        `Ajuste de tono solicitado: ${input.targetTone ?? "sobrio"}.`,
      generationMode: "fallback",
      fallbackReason: "ajuste local de tono"
    };
  }

  return {
    title: input.title,
    summary: input.summary,
    body: input.body,
    generationMode: "fallback",
    fallbackReason: "regeneración no disponible en fallback"
  };
}

export async function generateDraftWithGlm(
  input: GlmDraftInput
): Promise<GlmDraftOutput> {
  const apiKey = process.env.GLM_API_KEY;

  if (!apiKey) {
    console.warn("[GLM] Missing GLM_API_KEY, using fallback draft.");
    return {
      ...fallbackDraft(input),
      fallbackReason: "GLM_API_KEY ausente"
    };
  }

  const systemPrompt =
    "Eres un asistente editorial oncológico para el Dr. Antonio Camargo. " +
    "Debes devolver exclusivamente JSON válido con las claves title, summary y body. " +
    "Tu trabajo es convertir una propuesta humana en un primer borrador publicable, no cambiar el tema. " +
    "El tono debe ser riguroso, sobrio, clínico y publicable. " +
    "No uses markdown en title ni summary. El body puede usar subtítulos simples y párrafos claros. " +
    "No expliques el proceso ni digas que eres una IA. " +
    "Si el tipo es clinical_case, mantén estructura docente y no inventes datos identificables del paciente.";

  const userPrompt =
    `Tipo de pieza: ${input.kind}\n` +
    `Área oncológica: ${input.focus}\n` +
    `Tema propuesto por el Dr. Camargo: ${input.topic}\n` +
    `Ángulo pedido: ${input.angle}\n` +
    `Objetivo del texto: ${input.goal}\n` +
    `Tono deseado: ${input.tone}\n` +
    `Longitud deseada: ${input.length}\n` +
    `Claves que no deben faltar:\n${input.notes}\n\n` +
    "Desarrolla el artículo completo a partir de esa propuesta, respetando el tema, el ángulo y el objetivo.\n" +
    "Devuelve JSON con esta forma exacta:\n" +
    '{ "title": "...", "summary": "...", "body": "..." }';

  try {
    const response = await fetchWithTimeout(GLM_API_URL, 60000, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        thinking: {
          type: "disabled"
        },
        temperature: 0.4,
        max_tokens: resolveMaxTokens(input.length)
      })
    });

    if (!response.ok) {
      console.warn(`[GLM] Non-OK response ${response.status}, using fallback draft.`);
      return {
        ...fallbackDraft(input),
        fallbackReason: `respuesta no valida del proveedor (${response.status})`
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: GlmMessageContent;
          reasoning_content?: string;
        };
      }>;
    };

    const message = data.choices?.[0]?.message;
    const content = extractMessageText(message?.content, message?.reasoning_content);

    if (!content) {
      console.warn("[GLM] Empty message content, using fallback draft.");
      return {
        ...fallbackDraft(input),
        fallbackReason: "respuesta vacia del modelo"
      };
    }

    let parsed: Partial<GlmDraftOutput>;

    try {
      parsed = JSON.parse(extractJsonBlock(content)) as Partial<GlmDraftOutput>;
    } catch (error) {
      console.warn(
        "[GLM] JSON parse failed, using fallback draft. Content sample:",
        content.slice(0, 600)
      );
      throw error;
    }

    if (!parsed.title || !parsed.summary || !parsed.body) {
      console.warn("[GLM] Parsed response missing title/summary/body, using fallback draft.");
      return {
        ...fallbackDraft(input),
        fallbackReason: "JSON incompleto del modelo"
      };
    }

    return {
      title: parsed.title.trim(),
      summary: parsed.summary.trim(),
      body: parsed.body.trim(),
      generationMode: "glm"
    };
  } catch (error) {
    console.warn("[GLM] Exception while generating draft, using fallback draft.", error);
    return {
      ...fallbackDraft(input),
      fallbackReason: error instanceof Error ? error.message : "excepcion desconocida"
    };
  }
}

export async function refineDraftWithGlm(
  input: GlmRefineInput
): Promise<GlmDraftOutput> {
  const apiKey = process.env.GLM_API_KEY;

  if (!apiKey) {
    return {
      ...fallbackRefinement(input),
      fallbackReason: "GLM_API_KEY ausente"
    };
  }

  const operationPromptMap = {
    regenerate:
      "Reescribe por completo la pieza manteniendo el mismo tema central, pero mejorando claridad, estructura y calidad editorial.",
    expand:
      "Amplía la pieza con más contexto clínico, mejores transiciones y un cierre más sólido, sin desviarte del tema.",
    shorten:
      "Condensa la pieza para que quede más ágil y legible, conservando la tesis y la utilidad clínica.",
    retone:
      `Ajusta el tono de la pieza para que sea ${input.targetTone ?? "sobrio"}, sin alterar el tema ni la estructura básica.`
  } as const;

  const systemPrompt =
    "Eres un asistente editorial oncológico para el Dr. Antonio Camargo. " +
    "Debes devolver exclusivamente JSON válido con las claves title, summary y body. " +
    "Refinas borradores existentes sin cambiar el tema principal. " +
    "Mantén rigor clínico y claridad editorial. No expliques el proceso. " +
    "Si el tipo es clinical_case, conserva enfoque docente y evita introducir detalles identificables.";

  const userPrompt =
    `Tipo de pieza: ${input.kind}\n` +
    `Operacion: ${input.operation}\n` +
    `Titulo actual: ${input.title}\n` +
    `Resumen actual: ${input.summary}\n` +
    `Cuerpo actual:\n${input.body}\n\n` +
    `${operationPromptMap[input.operation]}\n\n` +
    "Devuelve JSON con esta forma exacta:\n" +
    '{ "title": "...", "summary": "...", "body": "..." }';

  try {
    const response = await fetchWithTimeout(GLM_API_URL, 60000, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        thinking: {
          type: "disabled"
        },
        temperature: input.operation === "regenerate" ? 0.5 : 0.35,
        max_tokens: input.operation === "expand" ? 1600 : 1100
      })
    });

    if (!response.ok) {
      return {
        ...fallbackRefinement(input),
        fallbackReason: `respuesta no valida del proveedor (${response.status})`
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: GlmMessageContent;
          reasoning_content?: string;
        };
      }>;
    };

    const message = data.choices?.[0]?.message;
    const content = extractMessageText(message?.content, message?.reasoning_content);

    if (!content) {
      return {
        ...fallbackRefinement(input),
        fallbackReason: "respuesta vacia del modelo"
      };
    }

    const parsed = JSON.parse(extractJsonBlock(content)) as Partial<GlmDraftOutput>;

    if (!parsed.title || !parsed.summary || !parsed.body) {
      return {
        ...fallbackRefinement(input),
        fallbackReason: "JSON incompleto del modelo"
      };
    }

    return {
      title: parsed.title.trim(),
      summary: parsed.summary.trim(),
      body: parsed.body.trim(),
      generationMode: "glm"
    };
  } catch (error) {
    return {
      ...fallbackRefinement(input),
      fallbackReason: error instanceof Error ? error.message : "excepcion desconocida"
    };
  }
}
