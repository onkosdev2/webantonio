const NEWS_SLUG_STOP_WORDS = new Set([
  "a", "al", "ante", "bajo", "con", "contra", "de", "del", "desde",
  "durante", "e", "el", "ella", "en", "entre", "es", "esta", "este",
  "ha", "hacia", "han", "hasta", "la", "las", "lo", "los", "ni", "o",
  "para", "por", "que", "se", "sin", "sobre", "su", "sus", "tras", "u",
  "un", "una", "unos", "unas", "y",
  "an", "and", "at", "by", "for", "from", "in", "into", "of", "on",
  "or", "the", "to", "with", "without"
]);

const MAX_NEWS_SLUG_LENGTH = 72;
const MAX_NEWS_SLUG_WORDS = 10;

function normalizeSlugTokens(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean);
}

function fitTokens(tokens: string[]) {
  const selected: string[] = [];

  for (const token of tokens) {
    if (selected.length >= MAX_NEWS_SLUG_WORDS) break;
    const candidate = [...selected, token].join("-");
    if (candidate.length > MAX_NEWS_SLUG_LENGTH) break;
    selected.push(token);
  }

  return selected.join("-");
}

export function buildSeoNewsSlug(input: string) {
  const tokens = normalizeSlugTokens(input);
  const keywords = tokens.filter((token) => !NEWS_SLUG_STOP_WORDS.has(token));
  const usefulTokens = keywords.length >= 2 ? keywords : tokens;

  return fitTokens(usefulTokens) || "noticia-oncologica";
}

export function isSeoNewsSlug(slug: string) {
  const tokens = normalizeSlugTokens(slug);

  return (
    slug.length <= MAX_NEWS_SLUG_LENGTH &&
    tokens.length >= 2 &&
    tokens.join("-") === slug &&
    tokens.every((token) => !NEWS_SLUG_STOP_WORDS.has(token))
  );
}
