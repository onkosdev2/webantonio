import { db } from "@/lib/db";
import { slugify } from "@/lib/content/cases";
import { buildSeoNewsSlug } from "@/lib/content/news-seo";

export function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function resolveUniqueContentSlug(
  input: string,
  excludeId?: string,
  maxLength = 80
) {
  const normalizedSlug = slugify(input) || "borrador";
  const baseSlug = normalizedSlug.length <= maxLength
    ? normalizedSlug
    : normalizedSlug.slice(0, maxLength).replace(/-[^-]*$/, "");
  const [existing, aliases] = await Promise.all([
    db.content.findMany({
      where: {
        slug: {
          startsWith: baseSlug
        },
        ...(excludeId
          ? {
              NOT: {
                id: excludeId
              }
            }
          : {})
      },
      select: {
        slug: true
      }
    }),
    db.contentSlugAlias.findMany({
      where: {
        slug: {
          startsWith: baseSlug
        },
        ...(excludeId ? { NOT: { contentId: excludeId } } : {})
      },
      select: {
        slug: true
      }
    })
  ]);

  const existingSlugs = new Set([
    ...existing.map((item) => item.slug),
    ...aliases.map((item) => item.slug)
  ]);

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  const withSuffix = () => {
    const ending = `-${suffix}`;
    const availableLength = maxLength - ending.length;
    const shortenedBase = baseSlug.length <= availableLength
      ? baseSlug
      : baseSlug.slice(0, availableLength).replace(/-[^-]*$/, "");
    return `${shortenedBase || baseSlug.slice(0, availableLength)}${ending}`;
  };

  let candidate = withSuffix();
  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = withSuffix();
  }

  return candidate;
}

export async function resolveUniqueNewsSlug(input: string, excludeId?: string) {
  return resolveUniqueContentSlug(buildSeoNewsSlug(input), excludeId, 72);
}
