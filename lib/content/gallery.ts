import { ContentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_ARCHIVE_PAGE_SIZE } from "@/lib/content/public-listing";

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

export async function getPublicGalleryPage(page: number, pageSize = PUBLIC_ARCHIVE_PAGE_SIZE) {
  const where = {
    isSensitive: false,
    OR: [
      { contentId: null },
      { content: { is: { status: ContentStatus.PUBLISHED } } }
    ]
  };
  const total = await db.mediaAsset.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const items = await db.mediaAsset.findMany({
    where,
    select: {
      id: true,
      title: true,
      altText: true,
      storagePath: true,
      mediaType: true,
      createdAt: true,
      content: { select: { slug: true, title: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      altText: item.altText ?? "",
      storagePath: item.storagePath,
      mediaType: item.mediaType,
      linkedContentSlug: item.content?.slug ?? "",
      linkedContentTitle: item.content?.title ?? "",
      createdAt: item.createdAt
    })),
    total,
    page: currentPage,
    pageCount
  };
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
