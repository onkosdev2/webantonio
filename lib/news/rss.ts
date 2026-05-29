import type { NewsSource } from "@/lib/news/source-registry";

export type ParsedFeedItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  focusHints: string[];
  priority: number;
};

function decodeXml(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(text: string) {
  return decodeXml(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function pickTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
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

export async function fetchRssItems(
  source: NewsSource,
  limit = 8
): Promise<ParsedFeedItem[]> {
  const response = await fetchWithTimeout(source.url, 8000, {
    headers: {
      "User-Agent": "DrAntonioCamargoNewsBot/1.0"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${source.id}`);
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .slice(0, limit)
    .map((match) => {
      const block = match[1];

      return {
        sourceId: source.id,
        sourceName: source.name,
        title: stripHtml(pickTag(block, "title")),
        link: decodeXml(pickTag(block, "link")),
        description: stripHtml(pickTag(block, "description")),
        publishedAt: pickTag(block, "pubDate"),
        focusHints: source.focusHints,
        priority: source.priority
      };
    })
    .filter((item) => item.title && item.link);

  return items;
}
