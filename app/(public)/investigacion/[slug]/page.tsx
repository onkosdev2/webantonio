import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicArticlePage } from "@/components/editorial/public-article-page";
import { getPublishedResearchBySlug } from "@/lib/content/research";
import { getPublicArchiveItems, getRelatedPublicItems } from "@/lib/content/public";
import { articleJsonLd, articleMetadata, breadcrumbJsonLd, physicianJsonLd } from "@/lib/seo";

type InvestigacionPublicaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: InvestigacionPublicaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedResearchBySlug(slug);

  if (!item) {
    return {};
  }

  return articleMetadata({
    title: `${item.title} | Investigación oncológica`,
    description: item.summary,
    path: `/investigacion/${item.slug}`,
    keywords: [item.source, ...item.tags, "investigación oncológica"].filter(Boolean)
  });
}

export default async function InvestigacionPublicaPage({
  params
}: InvestigacionPublicaPageProps) {
  const { slug } = await params;
  const [item, archiveItems] = await Promise.all([
    getPublishedResearchBySlug(slug),
    getPublicArchiveItems()
  ]);

  if (!item) {
    notFound();
  }

  const relatedItems = getRelatedPublicItems(archiveItems, {
    href: `/investigacion/${item.slug}`,
    type: "research",
    tags: item.tags
  });

  return (
    <PublicArticlePage
      kicker="Investigación publicada"
      title={item.title}
      summary={item.summary}
      body={item.body}
      backHref="/investigacion"
      backLabel="Volver a investigación"
      editHref={`/panel/investigacion/${item.slug}`}
      meta={[item.source ? `Fuente: ${item.source}` : ""].filter(Boolean)}
      tags={item.tags.map((tag) => ({
        label: tag,
        href: `/investigacion?tag=${encodeURIComponent(tag)}`
      }))}
      relatedItems={relatedItems}
      jsonLd={[
        physicianJsonLd,
        articleJsonLd({
          path: `/investigacion/${item.slug}`,
          headline: item.title,
          description: item.summary,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          articleSection: "Investigación oncológica",
          keywords: [item.source, ...item.tags].filter(Boolean)
        }),
        breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Investigación", path: "/investigacion" },
          { name: item.title, path: `/investigacion/${item.slug}` }
        ])
      ]}
    />
  );
}
