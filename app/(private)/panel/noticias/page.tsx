import { NewsForm } from "@/components/admin/news-form";
import { NewsPanel } from "@/components/admin/news-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { getNewsItems, getNewsStats } from "@/lib/content/news";
import { newsSources } from "@/lib/news/source-registry";
import {
  createNewsItemAction,
  runNewsIngestionAction
} from "@/app/(private)/panel/noticias/actions";

export default async function PanelNoticiasPage() {
  const [items, stats] = await Promise.all([getNewsItems(), getNewsStats()]);

  return (
    <AdminShell
      title="Noticias Oncologicas"
      subtitle="Cabina para el motor permanente de vigilancia, clasificación y redacción asistida de novedades oncológicas."
    >
      <NewsPanel
        items={items}
        totalNews={stats.totalNews}
        pendingReview={stats.pendingReview}
        drafts={stats.drafts}
        activeSources={stats.activeSources}
        lastRunAt={stats.lastRunAt}
        lastRunSummary={stats.lastRunSummary}
        lastFetched={stats.lastFetched}
        lastCreated={stats.lastCreated}
        lastSkipped={stats.lastSkipped}
        failedSources={stats.failedSources}
        sources={newsSources.map((source) => ({
          id: source.id,
          name: source.name,
          category: source.category,
          priority: source.priority
        }))}
        runIngestionAction={runNewsIngestionAction}
      />
      <NewsForm action={createNewsItemAction} enableAiGenerate />
    </AdminShell>
  );
}
