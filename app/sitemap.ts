import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getPublicArchiveItems } from "@/lib/content/public";

const staticRoutes = [
  "/",
  "/sobre-mi",
  "/casos-clinicos",
  "/noticias",
  "/editoriales",
  "/investigacion",
  "/reflexiones",
  "/orientacion-oncologica-remota",
  "/historias",
  "/galeria"
] as const;

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getPublicArchiveItems();
  const staticSitemapEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.75
  }));
  const contentSitemapEntries: MetadataRoute.Sitemap = items.map((item) => ({
    url: absoluteUrl(item.href),
    lastModified: item.updatedAt ?? item.publishedAt ?? undefined,
    changeFrequency: "monthly",
    priority: item.type === "clinical_case" ? 0.85 : 0.7
  }));

  return [
    ...staticSitemapEntries,
    ...contentSitemapEntries
  ];
}
