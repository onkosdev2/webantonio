import {
  AiTaskState,
  ContentStatus,
  ContentType,
  ImportState
} from "@prisma/client";
import { db } from "@/lib/db";

type DashboardTone = "gold" | "green";

function formatType(type: ContentType) {
  switch (type) {
    case ContentType.CLINICAL_CASE:
      return "Caso clinico";
    case ContentType.EDITORIAL:
      return "Editorial";
    case ContentType.RESEARCH:
      return "Investigacion";
    case ContentType.NEWS_ITEM:
      return "Noticia";
    case ContentType.REFLECTION:
      return "Reflexion";
    case ContentType.STORY:
      return "Historia";
    case ContentType.GALLERY_ASSET:
      return "Galeria";
  }
}

function buildPanelHref(type: ContentType, slug: string) {
  switch (type) {
    case ContentType.CLINICAL_CASE:
      return `/panel/casos/${slug}`;
    case ContentType.EDITORIAL:
      return `/panel/editoriales/${slug}`;
    case ContentType.RESEARCH:
      return `/panel/investigacion/${slug}`;
    case ContentType.NEWS_ITEM:
      return `/panel/noticias/${slug}`;
    case ContentType.REFLECTION:
      return `/panel/reflexiones/${slug}`;
    case ContentType.STORY:
      return `/panel/historias/${slug}`;
    case ContentType.GALLERY_ASSET:
      return "/panel/galeria";
  }
}

function formatImportState(state: ImportState) {
  switch (state) {
    case ImportState.RECEIVED:
      return "Recibido";
    case ImportState.VALIDATED:
      return "Validado";
    case ImportState.QUEUED:
      return "En cola";
    case ImportState.REVIEW_REQUIRED:
      return "Revisión requerida";
    case ImportState.FAILED:
      return "Fallido";
  }
}

function formatAiState(state: AiTaskState) {
  switch (state) {
    case AiTaskState.PENDING:
      return "Pendiente";
    case AiTaskState.RUNNING:
      return "En ejecución";
    case AiTaskState.READY:
      return "Listo";
    case AiTaskState.APPLIED:
      return "Aplicado";
  }
}

export async function getDashboardData() {
  const [
    totalContent,
    pendingReview,
    published,
    readyAiTasks,
    latestQueue,
    latestImports,
    latestAiTasks,
    contentCounts,
    mediaCount
  ] = await Promise.all([
    db.content.count(),
    db.content.count({
      where: { status: ContentStatus.PENDING_REVIEW }
    }),
    db.content.count({
      where: { status: ContentStatus.PUBLISHED }
    }),
    db.aiTask.count({
      where: { state: AiTaskState.READY }
    }),
    db.content.findMany({
      where: {
        status: {
          in: [ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW]
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6
    }),
    db.importLog.findMany({
      include: {
        content: {
          select: {
            slug: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 4
    }),
    db.aiTask.findMany({
      include: {
        content: {
          select: {
            slug: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 4
    }),
    db.content.groupBy({
      by: ["type"],
      _count: {
        _all: true
      }
    }),
    db.mediaAsset.count()
  ]);

  const stats: Array<{ value: string; label: string; tone: DashboardTone }> = [
    {
      value: String(totalContent).padStart(2, "0"),
      label: "piezas en archivo",
      tone: "gold"
    },
    {
      value: String(pendingReview).padStart(2, "0"),
      label: "pendientes de revisión",
      tone: "green"
    },
    {
      value: String(published).padStart(2, "0"),
      label: "publicadas",
      tone: "gold"
    },
    {
      value: String(readyAiTasks).padStart(2, "0"),
      label: "tareas IA listas",
      tone: "green"
    }
  ];

  const queueItems = latestQueue.map((item) => ({
    title: item.title,
    meta: `${formatType(item.type)} · ${item.status}`,
    detail: item.summary,
    href: buildPanelHref(item.type, item.slug)
  }));

  const importItems = latestImports.map((item) => ({
    title: item.source,
    meta: `${item.payloadType} · ${formatImportState(item.state)}`,
    detail: item.content?.title ?? item.payloadSummary,
    href:
      item.content?.slug && item.content?.type
        ? buildPanelHref(item.content.type, item.content.slug)
        : "/panel/importaciones"
  }));

  const aiItems = latestAiTasks.map((item) => ({
    title: item.title,
    meta: formatAiState(item.state),
    detail: item.content?.title ?? item.resultTitle ?? item.resultNote ?? item.prompt,
    href:
      item.content?.slug && item.content?.type
        ? buildPanelHref(item.content.type, item.content.slug)
        : "/panel/cola-ia"
  }));

  const countByType = new Map(
    contentCounts.map((item) => [item.type, item._count._all])
  );

  const modules = [
    {
      kicker: "Archivo",
      title: "Casos y narrativa",
      description:
        `${countByType.get(ContentType.CLINICAL_CASE) ?? 0} casos, ` +
        `${countByType.get(ContentType.REFLECTION) ?? 0} reflexiones y ` +
        `${countByType.get(ContentType.STORY) ?? 0} historias en el sistema.`
    },
    {
      kicker: "Actualidad",
      title: "Noticias, editoriales e investigacion",
      description:
        `${countByType.get(ContentType.NEWS_ITEM) ?? 0} noticias, ` +
        `${countByType.get(ContentType.EDITORIAL) ?? 0} editoriales y ` +
        `${countByType.get(ContentType.RESEARCH) ?? 0} piezas de investigacion bajo control editorial.`
    },
    {
      kicker: "Integraciones",
      title: "Importaciones e IA",
      description:
        `${latestImports.length} movimientos recientes de importación y ` +
        `${readyAiTasks} tareas IA listas para revisión.`
    },
    {
      kicker: "Media",
      title: "Galería clínica",
      description: `${mediaCount} activos visuales registrados en la plataforma.`
    }
  ];

  return {
    stats,
    queueItems,
    importItems,
    aiItems,
    modules
  };
}
