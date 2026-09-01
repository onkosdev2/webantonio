import { getPublishedNewsItems } from "@/lib/content/news";
import { absoluteUrl, siteName } from "@/lib/seo";

export const dynamic = "force-dynamic";

const NEWS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  const items = (await getPublishedNewsItems({ limit: 1000 })).filter(
    (item) => item.publishedAt && item.publishedAt.getTime() >= cutoff
  );

  const urls = items
    .map((item) => {
      const publishedAt = item.publishedAt;
      if (!publishedAt) return "";

      return [
        "  <url>",
        `    <loc>${escapeXml(absoluteUrl(`/noticias/${item.slug}`))}</loc>`,
        "    <news:news>",
        "      <news:publication>",
        `        <news:name>${escapeXml(siteName)}</news:name>`,
        "        <news:language>es</news:language>",
        "      </news:publication>",
        `      <news:publication_date>${publishedAt.toISOString()}</news:publication_date>`,
        `      <news:title>${escapeXml(item.title)}</news:title>`,
        "    </news:news>",
        "  </url>"
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    urls,
    "</urlset>"
  ]
    .filter(Boolean)
    .join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    }
  });
}
