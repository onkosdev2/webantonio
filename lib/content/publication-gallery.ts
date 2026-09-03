import { db } from "@/lib/db";
import { galleryUploadWhere } from "./gallery-policy";

export type PublicationGalleryImage = { id: string; src: string; alt: string; caption: string; origin: string };

export async function getPublicationGallery(contentId: string): Promise<PublicationGalleryImage[]> {
  const images = await db.mediaAsset.findMany({
    where: { ...galleryUploadWhere, contentId, galleryOrder: { not: null }, content: { status: "PUBLISHED" } },
    orderBy: [{ galleryOrder: "asc" }, { id: "asc" }]
  });
  return images.map((asset) => ({ id: asset.id, src: asset.storagePath, alt: asset.altText || asset.title, caption: asset.caption || asset.title, origin: asset.origin }));
}
