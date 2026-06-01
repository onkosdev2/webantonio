import { db } from "@/lib/db";

function parsePromptBrief(prompt: string) {
  const lines = prompt.split("\n").map((line) => line.trim());

  const pick = (label: string) =>
    lines.find((line) => line.startsWith(`${label}:`))?.split(":").slice(1).join(":").trim() ??
    "";

  return {
    pieceType: pick("Tipo de pieza"),
    focus: pick("Área oncológica"),
    topic: pick("Tema propuesto por el Dr. Camargo"),
    angle: pick("Ángulo"),
    goal: pick("Objetivo"),
    tone: pick("Tono"),
    length: pick("Longitud deseada")
  };
}

export async function getAiTasks() {
  const tasks = await db.aiTask.findMany({
    include: {
      content: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return tasks.map((task) => {
    const contentTags = Array.isArray(task.content?.tags)
      ? task.content.tags.filter((item): item is string => typeof item === "string")
      : [];
    const generationMode = contentTags.includes("ai_glm")
      ? "GLM 5.1"
      : contentTags.includes("ai_fallback")
        ? "Fallback local"
        : "Sin marca";
    const linkedContentHref =
      task.content?.type === "NEWS_ITEM"
        ? `/panel/noticias/${task.content.slug}`
        : task.content?.type === "EDITORIAL"
          ? `/panel/editoriales/${task.content.slug}`
          : task.content?.type === "RESEARCH"
            ? `/panel/investigacion/${task.content.slug}`
            : task.content?.type === "CLINICAL_CASE"
              ? `/panel/casos/${task.content.slug}`
              : task.content?.type === "REFLECTION"
                ? `/panel/reflexiones/${task.content.slug}`
                : task.content?.type === "STORY"
                  ? `/panel/historias/${task.content.slug}`
                  : "";
    const brief = parsePromptBrief(task.prompt);
    const reuseBriefHref =
      "/panel/cola-ia?" +
      new URLSearchParams({
        pieceType: brief.pieceType || "",
        focus: brief.focus,
        topic: brief.topic,
        angle: brief.angle,
        goal: brief.goal,
        tone: brief.tone,
        length: brief.length,
        notes: task.prompt.includes("Claves obligatorias:\n")
          ? task.prompt.split("Claves obligatorias:\n")[1]?.trim() ?? ""
          : ""
      }).toString();

    return {
      id: task.id,
      title: task.title,
      kind: task.kind,
      state: task.state,
      prompt: task.prompt,
      brief,
      generationMode,
      resultTitle: task.resultTitle ?? "",
      resultNote: task.resultNote ?? "",
      linkedContent: task.content?.title ?? "",
      linkedContentHref,
      reuseBriefHref
    };
  });
}

export async function getAiStats() {
  const [totalTasks, readyTasks, pendingTasks] = await Promise.all([
    db.aiTask.count(),
    db.aiTask.count({
      where: {
        state: "READY"
      }
    }),
    db.aiTask.count({
      where: {
        state: "PENDING"
      }
    })
  ]);

  return {
    totalTasks,
    readyTasks,
    pendingTasks
  };
}
