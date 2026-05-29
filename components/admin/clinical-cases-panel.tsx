import type { ContentStatus } from "@prisma/client";

type ClinicalCaseListItem = {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  summary: string;
  updatedAt: Date;
  tags: string[];
  tumorType: string;
  stage: string;
  biomarkers: string[];
  treatmentLine: string;
};

type ClinicalCasesPanelProps = {
  items: ClinicalCaseListItem[];
  totalCases: number;
  pendingReview: number;
  publishedCases: number;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function ClinicalCasesPanel({
  items,
  totalCases,
  pendingReview,
  publishedCases
}: ClinicalCasesPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid admin-stat-grid-3">
          <article className="admin-stat-card gold">
            <strong>{totalCases}</strong>
            <span>casos clinicos en la base</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{pendingReview}</strong>
            <span>pendientes de revision</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{publishedCases}</strong>
            <span>publicados o listos para difusion</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Modulo Operativo</span>
            <h2>Archivo clinico ya conectado a Prisma.</h2>
            <p>
              Desde aqui ya puedes crear, editar y revisar casos clinicos con
              datos persistidos en la base local.
            </p>
          </div>
          <a className="button primary" href="/panel/casos/nuevo">
            Nuevo caso clinico
          </a>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Listado Vivo</span>
            <h2>Casos en base de datos</h2>
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
                  <a className="button secondary" href={`/panel/casos/${item.slug}`}>
                    Editar
                  </a>
                </div>

                <p className="case-list-summary">{item.summary}</p>

                <div className="case-meta-grid">
                  <span>
                    <strong>Tumor</strong>
                    {item.tumorType || "Sin definir"}
                  </span>
                  <span>
                    <strong>Estadio</strong>
                    {item.stage || "Sin definir"}
                  </span>
                  <span>
                    <strong>Biomarcadores</strong>
                    {item.biomarkers.join(", ") || "No consignados"}
                  </span>
                  <span>
                    <strong>Linea</strong>
                    {item.treatmentLine || "No consignada"}
                  </span>
                </div>
              </div>

              <aside className="case-list-side">
                <span>
                  <strong>Slug</strong>
                  {item.slug}
                </span>
                <span>
                  <strong>Actualizado</strong>
                  {formatDate(item.updatedAt)}
                </span>
                <span>
                  <strong>Etiquetas</strong>
                  {item.tags.join(", ") || "Sin etiquetas"}
                </span>
              </aside>
            </article>
          ))}

          {items.length === 0 ? (
            <article className="case-list-item">
              <div className="case-list-main">
                <h3>No hay casos guardados todavía.</h3>
                <p className="case-list-summary">
                  Crea el primer caso desde el editor y quedará persistido en
                  la base SQLite del proyecto.
                </p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
