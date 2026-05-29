import { db } from "@/lib/db";
import { slugify } from "@/lib/content/cases";

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
  excludeId?: string
) {
  const baseSlug = slugify(input) || "borrador";
  const existing = await db.content.findMany({
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
  });

  const existingSlugs = new Set(existing.map((item) => item.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}
