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
