import type { MediaAsset, Prisma } from "@prisma/client";

// galleryOrder alone never makes a cover, generated figure or library asset eligible.
export const galleryUploadWhere = {
  isGalleryUpload: true,
  galleryUploadHash: { not: null },
  mediaType: "image",
  origin: "upload",
  isFeatured: false,
  isSensitive: false,
  figureId: null
} satisfies Prisma.MediaAssetWhereInput;

export function isGalleryUpload(asset: Pick<MediaAsset, "isGalleryUpload" | "galleryUploadHash" | "mediaType" | "origin" | "isFeatured" | "isSensitive" | "figureId">) {
  return asset.isGalleryUpload && Boolean(asset.galleryUploadHash) && asset.mediaType === "image"
    && asset.origin === "upload" && !asset.isFeatured && !asset.isSensitive && !asset.figureId;
}
