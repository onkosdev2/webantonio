import { ContentType } from "@prisma/client";
import { db } from "@/lib/db";

function buildPanelHref(type: ContentType) {
  switch (type) {
    case "CLINICAL_CASE":
      return "/panel/casos";
    case "EDITORIAL":
      return "/panel/editoriales";
    case "NEWS_ITEM":
      return "/panel/noticias";
    case "REFLECTION":
      return "/panel/reflexiones";
    case "STORY":
      return "/panel/historias";
    default:
      return "/panel";
  }
}

function splitSourceLabel(source: string) {
  const [channel, ...rest] = source.split(":");

  if (rest.length === 0) {
    return {
      channel: "manual",
      sourceLabel: source
    };
  }

  return {
    channel,
    sourceLabel: rest.join(":")
  };
}

export async function getImportLogs() {
  const items = await db.importLog.findMany({
    include: {
      content: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return items.map((item) => ({
    id: item.id,
    source: splitSourceLabel(item.source).sourceLabel,
    channel: splitSourceLabel(item.source).channel,
    payloadType: item.payloadType,
    payloadSummary: item.payloadSummary,
    state: item.state,
    notes: item.notes ?? "",
    linkedContent: item.content?.title ?? "",
    linkedContentHref:
      item.content?.slug && item.content?.type
        ? `${buildPanelHref(item.content.type)}/${item.content.slug}`
        : ""
  }));
}

export async function getImportStats() {
  const [totalImports, reviewRequired, validated, failedImports] = await Promise.all([
    db.importLog.count(),
    db.importLog.count({
      where: {
        state: "REVIEW_REQUIRED"
      }
    }),
    db.importLog.count({
      where: {
        state: "VALIDATED"
      }
    }),
    db.importLog.count({
      where: {
        state: "FAILED"
      }
    })
  ]);

  return {
    totalImports,
    reviewRequired,
    validated,
    failedImports
  };
}
