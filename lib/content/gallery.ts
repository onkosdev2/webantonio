import { ContentStatus } from "@prisma/client";
import { db } from "@/lib/db";

export async function getGalleryAssets() {
  const items = await db.mediaAsset.findMany({
    include: {
      content: {
        select: {
          slug: true,
          title: true,
          status: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    altText: item.altText ?? "",
    storagePath: item.storagePath,
    mediaType: item.mediaType,
    isSensitive: item.isSensitive,
    linkedContentSlug: item.content?.slug ?? "",
    linkedContentTitle: item.content?.title ?? "",
    linkedContentStatus: item.content?.status ?? null,
    effectiveVisibility:
      item.isSensitive || (item.content && item.content.status !== ContentStatus.PUBLISHED)
        ? ("PRIVATE" as const)
        : ("PUBLIC" as const),
    createdAt: item.createdAt
  }));
}

export async function getGalleryAssetById(id: string) {
  const item = await db.mediaAsset.findUnique({
    where: { id },
    include: {
      content: {
        select: {
          slug: true,
          title: true,
          status: true
        }
      }
    }
  });

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    altText: item.altText ?? "",
    storagePath: item.storagePath,
    mediaType: item.mediaType,
    isSensitive: item.isSensitive,
    linkedContentSlug: item.content?.slug ?? "",
    linkedContentTitle: item.content?.title ?? "",
    linkedContentStatus: item.content?.status ?? null,
    createdAt: item.createdAt
  };
}

export async function getPublicGalleryAssets() {
  const items = await db.mediaAsset.findMany({
    where: {
      isSensitive: false,
      OR: [
        {
          contentId: null
        },
        {
          content: {
            is: {
              status: ContentStatus.PUBLISHED
            }
          }
        }
      ]
    },
    include: {
      content: {
        select: {
          slug: true,
          title: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    altText: item.altText ?? "",
    storagePath: item.storagePath,
    mediaType: item.mediaType,
    linkedContentSlug: item.content?.slug ?? "",
    linkedContentTitle: item.content?.title ?? "",
    createdAt: item.createdAt
  }));
}

export async function getGalleryStats() {
  const [totalAssets, publicAssets, sensitiveAssets] = await Promise.all([
    db.mediaAsset.count(),
    db.mediaAsset.count({
      where: {
        isSensitive: false,
        OR: [
          {
            contentId: null
          },
          {
            content: {
              is: {
                status: ContentStatus.PUBLISHED
              }
            }
          }
        ]
      }
    }),
    db.mediaAsset.count({ where: { isSensitive: true } })
  ]);

  return {
    totalAssets,
    publicAssets,
    sensitiveAssets
  };
}
