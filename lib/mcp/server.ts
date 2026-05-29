import { ContentStatus, ContentType, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  isUniqueConstraintError,
  resolveUniqueContentSlug
} from "@/lib/content/slugs";

const searchArgsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(25).default(10)
});

export const createDraftArgsSchema = z.object({
  type: z.enum(["clinical_case", "editorial", "news_item", "reflection", "story"]),
  title: z.string().min(5),
  summary: z.string().min(20),
  body: z.string().min(50),
  source: z.string().default("mcp"),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "pending_review"]).default("draft"),
  tumorType: z.string().optional(),
  stage: z.string().optional(),
  biomarkers: z.array(z.string()).default([])
});

export const queueArgsSchema = z.object({
  slug: z.string().min(1)
});

function mapDraftType(type: z.infer<typeof createDraftArgsSchema>["type"]) {
  switch (type) {
    case "clinical_case":
      return ContentType.CLINICAL_CASE;
    case "editorial":
      return ContentType.EDITORIAL;
    case "news_item":
      return ContentType.NEWS_ITEM;
    case "reflection":
      return ContentType.REFLECTION;
    case "story":
      return ContentType.STORY;
  }
}

function mapDraftStatus(status: "draft" | "pending_review") {
  return status === "pending_review"
    ? ContentStatus.PENDING_REVIEW
    : ContentStatus.DRAFT;
}

export type CreateDraftArgs = z.input<typeof createDraftArgsSchema>;

function normalizeResult(item: {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  source: string | null;
  oncologyData?: {
    tumorType: string | null;
    stage: string | null;
    biomarkers: unknown;
  } | null;
}) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    status: item.status,
    source: item.source ?? "",
    tumorType: item.oncologyData?.tumorType ?? "",
    stage: item.oncologyData?.stage ?? "",
    biomarkers: Array.isArray(item.oncologyData?.biomarkers)
      ? item.oncologyData?.biomarkers
      : []
  };
}

async function searchContentByType(
  type: ContentType,
  input: z.infer<typeof searchArgsSchema>
) {
  const args = searchArgsSchema.parse(input);

  const items = await db.content.findMany({
    where: {
      type,
      OR: [
        { title: { contains: args.query } },
        { summary: { contains: args.query } },
        { body: { contains: args.query } },
        { slug: { contains: args.query } }
      ]
    },
    include: {
      oncologyData: true
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: args.limit
  });

  return items.map(normalizeResult);
}

export async function createDraftViaMcp(input: CreateDraftArgs) {
  const args = createDraftArgsSchema.parse(input);
  const title = args.title.trim();
  const summary = args.summary.trim();
  const body = args.body.trim();

  const oncologyCreate: Prisma.OncologyMetadataCreateWithoutContentInput = {
    tumorType: args.tumorType ?? "",
    stage: args.stage ?? "",
    biomarkers: args.biomarkers,
    toxicities: [],
    anonymized: true
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug =
      attempt === 0
        ? await resolveUniqueContentSlug(title)
        : await resolveUniqueContentSlug(`${title} ${attempt + 1}`);

    try {
      const created = await db.content.create({
        data: {
          type: mapDraftType(args.type),
          status: mapDraftStatus(args.status),
          title,
          slug,
          summary,
          body,
          source: args.source,
          author: "MCP draft tool",
          tags: args.tags,
          oncologyData: {
            create: oncologyCreate
          }
        },
        include: {
          oncologyData: true
        }
      });

      return normalizeResult(created);
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 4) {
        throw error;
      }
    }
  }

  throw new Error("No se pudo generar un slug único para el borrador.");
}

export async function queueDraftForReview(slug: string) {
  const args = queueArgsSchema.parse({ slug });

  const updated = await db.content.update({
    where: {
      slug: args.slug
    },
    data: {
      status: ContentStatus.PENDING_REVIEW
    },
    include: {
      oncologyData: true
    }
  });

  return normalizeResult(updated);
}

export async function listMcpResources() {
  const [caseCount, newsCount, editorialCount] = await Promise.all([
    db.content.count({ where: { type: ContentType.CLINICAL_CASE } }),
    db.content.count({ where: { type: ContentType.NEWS_ITEM } }),
    db.content.count({ where: { type: ContentType.EDITORIAL } })
  ]);

  return [
    {
      uri: "oncology://content/cases",
      name: "Casos clinicos",
      description: "Archivo estructurado de casos clinicos oncologicos.",
      count: caseCount
    },
    {
      uri: "oncology://content/news",
      name: "Noticias oncologicas",
      description: "Novedades clasificadas por relevancia clinica y tema.",
      count: newsCount
    },
    {
      uri: "oncology://content/editorials",
      name: "Editoriales",
      description: "Archivo de criterio clinico y pensamiento medico.",
      count: editorialCount
    }
  ];
}

export async function readMcpResource(uri: string) {
  if (uri === "oncology://content/cases") {
    return {
      uri,
      items: await searchContentByType(ContentType.CLINICAL_CASE, {
        query: "",
        limit: 20
      }).catch(async () => {
        const items = await db.content.findMany({
          where: { type: ContentType.CLINICAL_CASE },
          include: { oncologyData: true },
          orderBy: { updatedAt: "desc" },
          take: 20
        });

        return items.map(normalizeResult);
      })
    };
  }

  if (uri === "oncology://content/news") {
    return {
      uri,
      items: await db.content
        .findMany({
          where: { type: ContentType.NEWS_ITEM },
          include: { oncologyData: true },
          orderBy: { updatedAt: "desc" },
          take: 20
        })
        .then((items) => items.map(normalizeResult))
    };
  }

  if (uri === "oncology://content/editorials") {
    return {
      uri,
      items: await db.content
        .findMany({
          where: { type: ContentType.EDITORIAL },
          include: { oncologyData: true },
          orderBy: { updatedAt: "desc" },
          take: 20
        })
        .then((items) => items.map(normalizeResult))
    };
  }

  throw new Error(`Unknown MCP resource: ${uri}`);
}

export function listMcpTools() {
  return [
    {
      name: "search_cases",
      description: "Busca casos clinicos dentro del archivo oncologico."
    },
    {
      name: "search_news",
      description: "Busca noticias oncológicas publicadas o en revision."
    },
    {
      name: "create_draft",
      description: "Crea un borrador editorial, de caso, noticia o reflexión."
    },
    {
      name: "queue_for_review",
      description: "Mueve un contenido existente a estado pending_review."
    }
  ];
}

export async function callMcpTool(toolName: string, input: unknown) {
  if (toolName === "search_cases") {
    return {
      tool: toolName,
      items: await searchContentByType(ContentType.CLINICAL_CASE, input as z.infer<
        typeof searchArgsSchema
      >)
    };
  }

  if (toolName === "search_news") {
    return {
      tool: toolName,
      items: await searchContentByType(ContentType.NEWS_ITEM, input as z.infer<
        typeof searchArgsSchema
      >)
    };
  }

  if (toolName === "create_draft") {
    return {
      tool: toolName,
      item: await createDraftViaMcp(input as CreateDraftArgs)
    };
  }

  if (toolName === "queue_for_review") {
    return {
      tool: toolName,
      item: await queueDraftForReview(
        queueArgsSchema.parse(input).slug
      )
    };
  }

  throw new Error(`Unknown MCP tool: ${toolName}`);
}
