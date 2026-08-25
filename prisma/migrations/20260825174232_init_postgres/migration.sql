-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('CLINICAL_CASE', 'EDITORIAL', 'RESEARCH', 'NEWS_ITEM', 'STORY', 'REFLECTION', 'GALLERY_ASSET');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ImportState" AS ENUM ('RECEIVED', 'VALIDATED', 'QUEUED', 'REVIEW_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiTaskKind" AS ENUM ('NEWS_DRAFT', 'EDITORIAL_DRAFT', 'CASE_ENRICHMENT', 'COMMENT_REPLY');

-- CreateEnum
CREATE TYPE "AiTaskState" AS ENUM ('PENDING', 'RUNNING', 'READY', 'APPLIED');

-- CreateEnum
CREATE TYPE "VisualPlanStatus" AS ENUM ('PENDING', 'ANALYZING', 'RETRIEVING', 'REASONING', 'PLANNING', 'PROMPTING', 'COMPLIANCE_REVIEW', 'QUALITY_REVIEW', 'READY', 'REQUIRES_REVIEW', 'FAILED', 'STALE');

-- CreateEnum
CREATE TYPE "FigureStatus" AS ENUM ('PLANNED', 'READY', 'GENERATING', 'GENERATED', 'FAILED', 'STALE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "passwordHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT,
    "sourceUrl" TEXT,
    "author" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OncologyMetadata" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "tumorType" TEXT,
    "stage" TEXT,
    "biomarkers" JSONB NOT NULL DEFAULT '[]',
    "treatmentLine" TEXT,
    "treatmentPlan" TEXT,
    "response" TEXT,
    "toxicities" JSONB NOT NULL DEFAULT '[]',
    "evidenceLevel" TEXT,
    "reviewNotes" TEXT,
    "anonymized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OncologyMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "contentId" TEXT,
    "title" TEXT NOT NULL,
    "altText" TEXT,
    "storagePath" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT NOT NULL DEFAULT 'upload',
    "prompt" TEXT,
    "model" TEXT,
    "figureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseVisualPlan" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT 'onkos.visual-pipeline.v2',
    "policyVersion" TEXT NOT NULL DEFAULT 'figure-policy.v1',
    "sourceHash" TEXT NOT NULL,
    "status" "VisualPlanStatus" NOT NULL DEFAULT 'PENDING',
    "currentStage" TEXT NOT NULL DEFAULT 'privacy_validation',
    "sharedState" JSONB NOT NULL,
    "qualityScore" INTEGER,
    "error" TEXT,
    "model" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseVisualPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseFigure" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "figureNumber" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "educationalMessage" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "adjustedScore" INTEGER NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "supportedFacts" JSONB NOT NULL,
    "supportedKnowledge" JSONB NOT NULL,
    "recommendedVisualStyle" TEXT NOT NULL,
    "estimatedDifficulty" TEXT NOT NULL,
    "draftPrompt" TEXT,
    "optimizedPrompt" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'end_of_article',
    "placementAnchor" TEXT,
    "compliance" JSONB NOT NULL,
    "status" "FigureStatus" NOT NULL DEFAULT 'PLANNED',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payloadType" TEXT NOT NULL,
    "payloadSummary" TEXT NOT NULL,
    "state" "ImportState" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentId" TEXT,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTask" (
    "id" TEXT NOT NULL,
    "kind" "AiTaskKind" NOT NULL,
    "state" "AiTaskState" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "resultTitle" TEXT,
    "resultNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentId" TEXT,

    CONSTRAINT "AiTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OncologyMetadata_contentId_key" ON "OncologyMetadata"("contentId");

-- CreateIndex
CREATE INDEX "CaseVisualPlan_contentId_isCurrent_idx" ON "CaseVisualPlan"("contentId", "isCurrent");

-- CreateIndex
CREATE INDEX "CaseFigure_planId_status_idx" ON "CaseFigure"("planId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CaseFigure_planId_figureNumber_key" ON "CaseFigure"("planId", "figureNumber");

-- AddForeignKey
ALTER TABLE "OncologyMetadata" ADD CONSTRAINT "OncologyMetadata_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "CaseFigure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseVisualPlan" ADD CONSTRAINT "CaseVisualPlan_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseFigure" ADD CONSTRAINT "CaseFigure_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CaseVisualPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
