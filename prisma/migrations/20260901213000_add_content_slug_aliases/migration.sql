CREATE TABLE "ContentSlugAlias" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSlugAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentSlugAlias_slug_key" ON "ContentSlugAlias"("slug");
CREATE INDEX "ContentSlugAlias_contentId_idx" ON "ContentSlugAlias"("contentId");

ALTER TABLE "ContentSlugAlias"
ADD CONSTRAINT "ContentSlugAlias_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
