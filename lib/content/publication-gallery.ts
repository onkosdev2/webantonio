import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { galleryUploadWhere } from "./gallery-policy";
import { publicContentCacheOptions } from "./public-cache";

export type PublicationGalleryImage = { id: string; src: string; alt: string; caption: string; origin: string };

async function queryPublicationGallery(contentId: string): Promise<PublicationGalleryImage[]> {
  const images = await db.mediaAsset.findMany({
    where: { ...galleryUploadWhere, contentId, galleryOrder: { not: null }, content: { status: "PUBLISHED" } },
    select: {
      id: true,
      storagePath: true,
      altText: true,
      title: true,
      caption: true,
      origin: true
    },
    orderBy: [{ galleryOrder: "asc" }, { id: "asc" }]
  });
  return images.map((asset) => ({ id: asset.id, src: asset.storagePath, alt: asset.altText || asset.title, caption: asset.caption || asset.title, origin: asset.origin }));
}

const getCachedPublicationGallery = unstable_cache(
  queryPublicationGallery,
  ["published-gallery-v2"],
  publicContentCacheOptions()
);

export async function getPublicationGallery(contentId: string) {
  return getCachedPublicationGallery(contentId);
}
