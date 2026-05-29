import type { ContentStatus } from "@prisma/client";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  source: string;
  tags: string[];
  generationLabel: string;
  tumorType: string;
  biomarkers: string[];
};

type NewsPanelProps = {
  items: NewsItem[];
  totalNews: number;
  pendingReview: number;
  drafts: number;
  activeSources: number;
  lastRunAt: Date | null;
  lastRunSummary: string;
  lastFetched: number;
  lastCreated: number;
  lastSkipped: number;
  failedSources: string[];
  sources: Array<{
    id: string;
    name: string;
    category: string;
    priority: number;
  }>;
  runIngestionAction: () => Promise<void>;
};

export function NewsPanel({
  items,
  totalNews,
  pendingReview,
  drafts,
  activeSources,
  lastRunAt,
  lastRunSummary,
  lastFetched,
  lastCreated,
  lastSkipped,
  failedSources,
  sources,
  runIngestionAction
}: NewsPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid">
          <article className="admin-stat-card gold">
            <strong>{totalNews}</strong>
            <span>noticias en archivo</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{pendingReview}</strong>
            <span>listas para lectura editorial</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{drafts}</strong>
            <span>borradores aún en preparación</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{activeSources}</strong>
            <span>fuentes activas en el radar</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Radar Operativo</span>
            <h2>Noticias conectadas a base de datos y listas para revisión.</h2>
            <p>
              Ya puedes crear noticias oncológicas desde el panel, ejecutar la
              ingestión continua y ver el resultado dentro del flujo editorial.
            </p>
          </div>
          <div className="admin-topbar-actions">
            <form action={runIngestionAction}>
              <button className="button secondary" type="submit">
                Ejecutar motor continuo
              </button>
            </form>
            <a className="button primary" href="/panel/noticias#editor">
              Nueva noticia
            </a>
          </div>
        </div>
      </section>

      <section className="admin-section-span dashboard-three-col">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Última ejecución</span>
              <h2>Estado del motor</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-list-item">
              <div>
                <h3>{lastRunAt ? new Date(lastRunAt).toLocaleString() : "Sin ejecuciones aún"}</h3>
                <p className="admin-item-meta">
                  {lastRunSummary || "Todavía no hay un lote registrado."}
                </p>
              </div>
              <p>
                {lastRunAt
                  ? "La última corrida ya quedó registrada con métricas del lote."
                  : "Ejecuta el motor continuo para registrar el primer lote y medir su rendimiento."}
              </p>
            </article>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Métricas del lote</span>
              <h2>Captura y depuración</h2>
            </div>
          </div>
          <div className="admin-list">
            <article className="admin-list-item">
              <div>
                <h3>{lastFetched} captadas</h3>
                <p className="admin-item-meta">{lastCreated} creadas · {lastSkipped} omitidas</p>
              </div>
              <p>
                {failedSources.length > 0
                  ? `Fuentes con fallo reciente: ${failedSources.join(", ")}`
                  : "No se detectaron fallos de fuente en el último lote."}
              </p>
            </article>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Fuentes</span>
              <h2>Radar configurado</h2>
            </div>
          </div>
          <div className="admin-list">
            {sources.map((source) => (
              <article key={source.id} className="admin-list-item">
                <div>
                  <h3>{source.name}</h3>
                  <p className="admin-item-meta">
                    {source.category} · prioridad {source.priority}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Noticias</span>
            <h2>Borradores y piezas detectadas</h2>
          </div>
        </div>

        <div className="case-list">
          {items.map((item) => (
            <article key={item.id} className="case-list-item">
              <div className="case-list-main">
                <div className="case-list-heading">
                  <div>
                    <span className="case-status-badge">{item.status}</span>
                    <h3>{item.title}</h3>
                  </div>
                </div>

                <p className="case-list-summary">{item.summary}</p>

                <div className="case-meta-grid">
                  <span>
                    <strong>Fuente</strong>
                    {item.source}
                  </span>
                  <span>
                    <strong>Generacion</strong>
                    {item.generationLabel}
                  </span>
                  <span>
                    <strong>Tumor</strong>
                    {item.tumorType || "General"}
                  </span>
                  <span>
                    <strong>Biomarcadores</strong>
                    {item.biomarkers.join(", ") || "No consignados"}
                  </span>
                  <span>
                    <strong>Etiquetas</strong>
                    {item.tags.join(", ") || "Sin etiquetas"}
                  </span>
                </div>
              </div>

              <aside className="case-list-side">
                <span>
                  <strong>Slug</strong>
                  {item.slug}
                </span>
                <a className="button secondary" href={`/panel/noticias/${item.slug}`}>
                  Abrir borrador
                </a>
              </aside>
            </article>
          ))}

          {items.length === 0 ? (
            <article className="case-list-item">
              <div className="case-list-main">
                <h3>No hay noticias todavía.</h3>
                <p className="case-list-summary">
                  Crea la primera noticia oncológica desde el editor y
                  comenzará a poblar el radar editorial.
                </p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
