import { ContentType, ImportState, PrismaClient } from "@prisma/client";
import { buildSeoNewsSlug, isSeoNewsSlug } from "../lib/content/news-seo";

const db = new PrismaClient();
const apply = process.argv.includes("--apply");
const MAX_SLUG_LENGTH = 72;

function addSuffix(base: string, suffix: number) {
  const ending = `-${suffix}`;
  const maximumBaseLength = MAX_SLUG_LENGTH - ending.length;
  if (base.length <= maximumBaseLength) return `${base}${ending}`;

  const shortened = base
    .split("-")
    .reduce<string[]>((tokens, token) => {
      const candidate = [...tokens, token].join("-");
      return candidate.length <= maximumBaseLength ? [...tokens, token] : tokens;
    }, [])
    .join("-");

  return `${shortened || base.slice(0, maximumBaseLength)}${ending}`;
}

async function main() {
  const [newsItems, otherContent, aliases] = await Promise.all([
    db.content.findMany({
      where: { type: ContentType.NEWS_ITEM },
      select: { id: true, title: true, slug: true, status: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "asc" }]
    }),
    db.content.findMany({
      where: { NOT: { type: ContentType.NEWS_ITEM } },
      select: { slug: true }
    }),
    db.contentSlugAlias.findMany({ select: { slug: true, contentId: true } })
  ]);

  const reserved = new Set([
    ...otherContent.map((item) => item.slug),
    ...newsItems.map((item) => item.slug),
    ...aliases.map((item) => item.slug)
  ]);
  const aliasesByContent = new Map<string, string[]>();
  for (const alias of aliases) {
    aliasesByContent.set(alias.contentId, [
      ...(aliasesByContent.get(alias.contentId) || []),
      alias.slug
    ]);
  }

  const plans = newsItems.map((item) => {
    reserved.delete(item.slug);
    for (const alias of aliasesByContent.get(item.id) || []) reserved.delete(alias);

    const base = isSeoNewsSlug(item.slug)
      ? item.slug
      : buildSeoNewsSlug(item.title);
    let nextSlug = base;
    let suffix = 2;
    while (reserved.has(nextSlug)) {
      nextSlug = addSuffix(base, suffix);
      suffix += 1;
    }

    reserved.add(nextSlug);
    if (item.slug !== nextSlug) reserved.add(item.slug);
    for (const alias of aliasesByContent.get(item.id) || []) {
      if (alias !== nextSlug) reserved.add(alias);
    }

    return {
      id: item.id,
      title: item.title,
      status: item.status,
      previousSlug: item.slug,
      nextSlug,
      changed: item.slug !== nextSlug
    };
  });

  const changes = plans.filter((item) => item.changed);
  console.table(changes.map(({ title, status, previousSlug, nextSlug }) => ({
    status,
    title,
    previousSlug,
    nextSlug
  })));
  console.log(`${changes.length} de ${plans.length} slugs requieren optimización.`);

  if (!apply || changes.length === 0) {
    console.log(apply ? "No hay cambios por aplicar." : "Vista previa solamente. Usa --apply para guardar.");
    return;
  }

  for (const change of changes) {
    await db.$transaction(async (tx) => {
      await tx.contentSlugAlias.deleteMany({
        where: { contentId: change.id, slug: change.nextSlug }
      });
      await tx.content.update({
        where: { id: change.id },
        data: { slug: change.nextSlug }
      });
      await tx.contentSlugAlias.upsert({
        where: { slug: change.previousSlug },
        create: { contentId: change.id, slug: change.previousSlug },
        update: { contentId: change.id }
      });
      await tx.importLog.create({
        data: {
          source: "system:news-seo-slug-migration",
          payloadType: "news_slug_optimization",
          payloadSummary: `Slug SEO optimizado: ${change.title}`,
          state: ImportState.VALIDATED,
          contentId: change.id,
          notes: JSON.stringify({
            previousSlug: change.previousSlug,
            optimizedSlug: change.nextSlug
          })
        }
      });
    });
  }

  console.log(`${changes.length} slugs optimizados y sus alias históricos registrados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
