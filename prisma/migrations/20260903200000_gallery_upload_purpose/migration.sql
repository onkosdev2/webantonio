-- Only the dedicated upload flow may opt an image into a publication gallery.
-- Existing covers and generated figures deliberately remain unclassified.
ALTER TABLE "MediaAsset" ADD COLUMN "isGalleryUpload" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MediaAsset" ADD COLUMN "galleryUploadHash" TEXT;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_gallery_upload_is_separate"
CHECK (NOT "isGalleryUpload" OR (
  "mediaType" = 'image' AND "origin" = 'upload' AND NOT "isFeatured"
  AND "figureId" IS NULL AND "galleryUploadHash" IS NOT NULL
));
