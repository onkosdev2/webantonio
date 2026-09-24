import { revalidateTag } from "next/cache";

export const PUBLIC_CONTENT_CACHE_TAG = "public-content";
export const PUBLIC_CONTENT_REVALIDATE_SECONDS = 600;

export function publicContentCacheOptions() {
  return {
    revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
    tags: [PUBLIC_CONTENT_CACHE_TAG]
  };
}

export function revalidatePublicContentCache() {
  revalidateTag(PUBLIC_CONTENT_CACHE_TAG);
}

export function revivePublicationDates<
  T extends {
    publishedAt: Date | string | null;
    updatedAt: Date | string;
  }
>(item: T) {
  return {
    ...item,
    publishedAt:
      item.publishedAt instanceof Date
        ? item.publishedAt
        : item.publishedAt
          ? new Date(item.publishedAt)
          : null,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt)
  };
}

export function reviveOptionalPublicationDates<
  T extends {
    publishedAt?: Date | string | null;
    updatedAt?: Date | string | null;
  }
>(item: T) {
  return {
    ...item,
    publishedAt:
      item.publishedAt instanceof Date
        ? item.publishedAt
        : item.publishedAt
          ? new Date(item.publishedAt)
          : item.publishedAt,
    updatedAt:
      item.updatedAt instanceof Date
        ? item.updatedAt
        : item.updatedAt
          ? new Date(item.updatedAt)
          : item.updatedAt
  };
}
