import { newsSources } from "@/lib/news/source-registry";

/**
 * Etiquetas de trabajo que el panel, la IA o la ingesta de noticias agregan
 * al contenido (p. ej. "mcp_chatgpt", "automated_publish", "news_ingest",
 * "ai_glm", "editorial_draft", "validado"). Sirven internamente, pero no
 * deben mostrarse en la web pública ni en los filtros de búsqueda.
 */
const INTERNAL_TAGS = new Set(
  [
    "ia",
    "validado",
    "validada",
    "revisado",
    "revisada",
    "aprobado",
    "aprobada",
    "borrador",
    "pendiente",
    "publicado",
    "automatizado",
    "manual",
    "chatgpt",
    "glm",
    "openai",
    ...newsSources.map((source) => source.id)
  ].map((tag) => tag.toLowerCase())
);

export function isInternalTag(tag: string) {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return true;
  // Las etiquetas técnicas usan guion bajo (snake_case); los temas reales no.
  if (normalized.includes("_")) return true;
  return INTERNAL_TAGS.has(normalized);
}

/** Convierte el campo `tags` de la base en la lista de temas públicos. */
export function toPublicTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (tag): tag is string => typeof tag === "string" && !isInternalTag(tag)
  );
}

export const REVIEWED_BY_LABEL = "Revisado por el Dr. Antonio Camargo";

/**
 * Fuentes técnicas guardadas por el panel, la IA o la integración MCP
 * ("ChatGPT", "chatgpt_mcp", "mcp:...", "system:...", "manual").
 */
export function isInternalSource(source: string | null | undefined) {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    (!/\s/.test(normalized) && normalized.includes("_")) ||
    /^(mcp|system|import|panel)[:\s-]/.test(normalized) ||
    /\b(chatgpt|openai|gpt|glm|ia|ai)\b/.test(normalized) ||
    normalized === "manual"
  );
}

/** Texto de la fuente para la web pública (o null si no hay fuente). */
export function publicSourceText(source: string | null | undefined) {
  const value = (source ?? "").trim();
  if (!value) return null;
  return isInternalSource(value) ? REVIEWED_BY_LABEL : value;
}

/** Etiqueta completa: "Fuente: X" o "Revisado por el Dr. Antonio Camargo". */
export function publicSourceLabel(source: string | null | undefined) {
  const text = publicSourceText(source);
  if (!text) return null;
  return text === REVIEWED_BY_LABEL ? text : `Fuente: ${text}`;
}

/** Fuente apta para palabras clave (las técnicas se descartan). */
export function publicSourceKeyword(source: string | null | undefined) {
  const value = (source ?? "").trim();
  return value && !isInternalSource(value) ? value : "";
}
