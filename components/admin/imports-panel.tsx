import type { ImportState } from "@prisma/client";

type ImportLogItem = {
  id: string;
  source: string;
  channel: string;
  payloadType: string;
  payloadSummary: string;
  state: ImportState;
  notes: string;
  linkedContent: string;
  linkedContentHref: string;
};

type ImportsPanelProps = {
  items: ImportLogItem[];
  totalImports: number;
  reviewRequired: number;
  validated: number;
  failedImports: number;
};

export function ImportsPanel({
  items,
  totalImports,
  reviewRequired,
  validated,
  failedImports
}: ImportsPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid">
          <article className="admin-stat-card gold">
            <strong>{totalImports}</strong>
            <span>importaciones registradas</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{validated}</strong>
            <span>entradas validadas</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{reviewRequired}</strong>
            <span>requieren revisión humana</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{failedImports}</strong>
            <span>fallidas o incompletas</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Puerta de Entrada</span>
            <h2>Importaciones externas con trazabilidad real.</h2>
            <p>
              Este módulo ya registra el origen de la entrada y crea contenido
              editorial enlazado en la base.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Historial</span>
            <h2>Entradas recibidas</h2>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>canal</th>
                <th>origen</th>
                <th>tipo</th>
                <th>payload</th>
                <th>estado</th>
                <th>notas</th>
                <th>contenido</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.channel}</td>
                  <td>{item.source}</td>
                  <td>{item.payloadType}</td>
                  <td>{item.payloadSummary}</td>
                  <td>{item.state}</td>
                  <td>{item.notes || "-"}</td>
                  <td>
                    {item.linkedContentHref ? (
                      <a className="button secondary" href={item.linkedContentHref}>
                        Abrir {item.linkedContent}
                      </a>
                    ) : (
                      item.linkedContent || "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
