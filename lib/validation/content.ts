import { z } from "zod";

export const contentImportSchema = z.object({
  type: z.enum([
    "clinical_case",
    "editorial",
    "news_item",
    "reflection",
    "story",
    "gallery_asset"
  ]),
  title: z.string().min(5),
  summary: z.string().min(20),
  body: z.string().min(50),
  tags: z.array(z.string()).default([]),
  source: z.string().min(2),
  status: z.enum(["draft", "pending_review"]).default("draft"),
  tumorType: z.string().optional(),
  stage: z.string().optional(),
  biomarkers: z.array(z.string()).default([])
});

export type ContentImportInput = z.infer<typeof contentImportSchema>;
