import { AiForm } from "@/components/admin/ai-form";
import { AiPanel } from "@/components/admin/ai-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAiStats, getAiTasks } from "@/lib/content/ai";
import { createAiTaskAction } from "@/app/(private)/panel/cola-ia/actions";

type PanelColaIaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PanelColaIaPage({
  searchParams
}: PanelColaIaPageProps) {
  const [items, stats] = await Promise.all([getAiTasks(), getAiStats()]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const getValue = (key: string) => {
    const value = resolvedSearchParams[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };

  const pieceTypeParam = getValue("pieceType");
  const initialPieceType: "news_item" | "editorial" | "reflection" | "story" | "clinical_case" =
    pieceTypeParam === "editorial" ||
    pieceTypeParam === "reflection" ||
    pieceTypeParam === "story" ||
    pieceTypeParam === "clinical_case"
      ? pieceTypeParam
      : "news_item";
  const initialValues = {
    pieceType: initialPieceType,
    focus: getValue("focus"),
    topic: getValue("topic"),
    angle: getValue("angle"),
    goal: getValue("goal"),
    tone: getValue("tone") || "sobrio",
    length: getValue("length") || "media",
    notes: getValue("notes")
  };

  return (
    <AdminShell
      title="Cola IA"
      subtitle="Asistente de escritura para que propongas una idea, la IA redacte el primer borrador y tú decidas si corregir, enriquecer o publicar."
    >
      <AiPanel
        items={items}
        totalTasks={stats.totalTasks}
        readyTasks={stats.readyTasks}
        pendingTasks={stats.pendingTasks}
      />
      <AiForm action={createAiTaskAction} initialValues={initialValues} />
    </AdminShell>
  );
}
