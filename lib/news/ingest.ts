import { ImportState } from "@prisma/client";
import { db } from "@/lib/db";
import { generateDraftWithGlm } from "@/lib/ai/glm";
import { createEditorialDraft, queueDraftForReview } from "@/lib/content/editorial-workflows";
import { newsSources } from "@/lib/news/source-registry";
import { fetchRssItems, type ParsedFeedItem } from "@/lib/news/rss";

type IngestOptions = {
  limitPerSource?: number;
  maxItems?: number;
  maxAiItems?: number;
};

function inferTumorType(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("lung cancer") || lower.includes("pulmonary") || lower.includes("lung")) {
    return "Cancer de pulmon";
  }

  if (lower.includes("breast cancer") || lower.includes("her2")) {
    return "Cancer de mama";
  }

  if (lower.includes("melanoma")) {
    return "Melanoma";
  }

  if (lower.includes("colon cancer") || lower.includes("colorectal")) {
    return "Cancer colorrectal";
  }

  return "";
}

function inferBiomarkers(text: string) {
  const lower = text.toLowerCase();
  const matches = ["egfr", "alk", "her2", "pd-l1", "kras", "braf"].filter((marker) =>
    lower.includes(marker.toLowerCase())
  );

  return matches.map((marker) => marker.toUpperCase());
}

function scoreItem(item: ParsedFeedItem) {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  let score = item.priority * 10;

  const highSignalKeywords = [
    "phase 3",
    "overall survival",
    "progression-free survival",
    "approval",
    "asco",
    "esmo",
    "trial"
  ];

  for (const keyword of highSignalKeywords) {
    if (haystack.includes(keyword)) {
      score += 8;
    }
  }

  for (const hint of item.focusHints) {
    if (haystack.includes(hint.toLowerCase())) {
      score += 5;
    }
  }

  return score;
}

function buildFallbackNewsBody(item: ParsedFeedItem) {
  return (
    `Fuente detectada: ${item.sourceName}\n\n` +
    `Titular: ${item.title}\n\n` +
    `Resumen base: ${item.description}\n\n` +
    `Enlace original: ${item.link}\n\n` +
    "Lectura editorial inicial\n\n" +
    "Este borrador debe revisarse para valorar relevancia clínica, nivel de evidencia y aplicabilidad real antes de su publicación."
  );
}

export async function ingestOncologyNews(options: IngestOptions = {}) {
  const limitPerSource = options.limitPerSource ?? 4;
  const maxItems = options.maxItems ?? 12;
  const maxAiItems = options.maxAiItems ?? 5;

  const settled = await Promise.allSettled(
    newsSources.map((source) => fetchRssItems(source, limitPerSource))
  );
  const failedSources = settled.flatMap((result, index) =>
    result.status === "rejected"
      ? [newsSources[index]?.name ?? `source_${index + 1}`]
      : []
  );

  const fetched = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  const ranked = fetched
    .map((item) => ({
      item,
      score: scoreItem(item)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);

  let createdCount = 0;
  let skippedCount = 0;
  const createdItems: Array<{ slug: string; title: string; source: string; status: string }> = [];

  for (let index = 0; index < ranked.length; index += 1) {
    const { item, score } = ranked[index];
    const exists = await db.content.findFirst({
      where: {
        title: item.title,
        source: item.sourceName
      }
    });

    if (exists) {
      skippedCount += 1;
      continue;
    }

    const aiEnabled = index < maxAiItems;
    const generated = aiEnabled
      ? await generateDraftWithGlm({
          kind: "news_item",
          focus: inferTumorType(`${item.title} ${item.description}`) || "oncologia",
          topic: item.title,
          angle: "prudente y clinico",
          goal: "explicar la novedad y su impacto real",
          tone: "sobrio",
          length: "media",
          notes:
            `Fuente: ${item.sourceName}\n` +
            `Link: ${item.link}\n` +
            `Descripcion: ${item.description}\n` +
            `Score de relevancia: ${score}\n` +
            "Genera un borrador corto, claro y clínicamente prudente."
        })
      : {
          title: item.title,
          summary: item.description.slice(0, 220) || `Novedad detectada desde ${item.sourceName}.`,
          body: buildFallbackNewsBody(item),
          generationMode: "fallback" as const,
          fallbackReason: "item fuera del cupo de generación con GLM"
        };

    const tumorType = inferTumorType(`${item.title} ${item.description}`);
    const biomarkers = inferBiomarkers(`${item.title} ${item.description}`);

    const created = await createEditorialDraft({
      type: "news_item",
      title: generated.title,
      summary: generated.summary,
      body: `${generated.body}\n\nFuente original: ${item.link}`,
      source: item.sourceName,
      sourceUrl: item.link,
      tags: [
        "news_ingest",
        generated.generationMode === "glm" ? "ai_glm" : "ai_fallback",
        item.sourceId,
        ...(tumorType ? [tumorType.toLowerCase()] : []),
        ...biomarkers.map((marker) => marker.toLowerCase())
      ],
      status: "draft",
      tumorType,
      biomarkers
    });

    const queued = await queueDraftForReview(created.slug);

    await db.importLog.create({
      data: {
        source: item.sourceName,
        payloadType: "news_item",
        payloadSummary: item.description.slice(0, 180),
        state: ImportState.VALIDATED,
        contentId: queued.id,
        notes:
          `Ingerido por RSS desde ${item.link}. ` +
          `Motor: ${generated.generationMode === "glm" ? "GLM 5.1" : "fallback local"}. ` +
          (generated.fallbackReason
            ? `Motivo: ${generated.fallbackReason}`
            : "")
      }
    });

    createdCount += 1;
    createdItems.push({
      slug: queued.slug,
      title: queued.title,
      source: item.sourceName,
      status: queued.status
    });
  }

  await db.importLog.create({
    data: {
      source: "system:news-ingest-engine",
      payloadType: "news_batch",
      payloadSummary:
        `${fetched.length} captadas · ${createdCount} creadas · ` +
        `${skippedCount} omitidas`,
      state:
        failedSources.length === newsSources.length
          ? ImportState.FAILED
          : ImportState.VALIDATED,
      notes: JSON.stringify({
        scannedSources: newsSources.length,
        fetchedItems: fetched.length,
        createdCount,
        skippedCount,
        failedSources,
        createdItems
      })
    }
  });

  return {
    scannedSources: newsSources.length,
    fetchedItems: fetched.length,
    createdCount,
    skippedCount,
    failedSources,
    createdItems
  };
}
