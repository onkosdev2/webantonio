ALTER TABLE "MediaAsset" ADD COLUMN "galleryOrder" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN "caption" TEXT;
CREATE INDEX "MediaAsset_contentId_galleryOrder_idx" ON "MediaAsset"("contentId", "galleryOrder");
