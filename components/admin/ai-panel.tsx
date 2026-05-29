import type { AiTaskKind, AiTaskState } from "@prisma/client";

type AiTaskItem = {
  id: string;
  title: string;
  kind: AiTaskKind;
  state: AiTaskState;
  prompt: string;
  brief: {
    pieceType: string;
    focus: string;
    topic: string;
    angle: string;
    goal: string;
    tone: string;
    length: string;
  };
  generationMode: string;
  resultTitle: string;
  resultNote: string;
  linkedContent: string;
  linkedContentHref: string;
  reuseBriefHref: string;
};

type AiPanelProps = {
  items: AiTaskItem[];
  totalTasks: number;
  readyTasks: number;
  pendingTasks: number;
};

export function AiPanel({
  items,
  totalTasks,
  readyTasks,
  pendingTasks
}: AiPanelProps) {
  return (
    <div className="admin-content-grid">
      <section className="admin-section-span">
        <div className="admin-stat-grid admin-stat-grid-3">
          <article className="admin-stat-card gold">
            <strong>{totalTasks}</strong>
            <span>tareas IA registradas</span>
          </article>
          <article className="admin-stat-card green">
            <strong>{readyTasks}</strong>
            <span>borradores listos para revisión</span>
          </article>
          <article className="admin-stat-card gold">
            <strong>{pendingTasks}</strong>
            <span>pendientes o en preparación</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-section-span admin-hero-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">Cabina de Escritura</span>
            <h2>La idea sale de ti. La IA se encarga del primer desarrollo.</h2>
            <p>
              Usa esta cola como un taller editorial: propones el tema, marcas
              el ángulo y recibes un borrador listo para revisar, enriquecer o
              publicar.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Borradores asistidos</span>
            <h2>Piezas generadas a partir de tus propuestas</h2>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>propuesta</th>
                <th>pieza</th>
                <th>brief</th>
                <th>motor</th>
                <th>estado</th>
                <th>resultado</th>
                <th>accion</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>
                    {item.brief.pieceType === "editorial"
                      ? "Editorial"
                      : item.brief.pieceType === "reflection"
                        ? "Reflexión"
                        : item.brief.pieceType === "story"
                          ? "Historia"
                          : item.brief.pieceType === "clinical_case"
                            ? "Caso clínico"
                            : "Noticia comentada"}
                  </td>
                  <td>
                    <strong>{item.brief.focus || "General"}</strong>
                    <br />
                    {item.brief.angle || "Sin angulo"} · {item.brief.goal || "Sin objetivo"}
                  </td>
                  <td>{item.generationMode}</td>
                  <td>{item.state}</td>
                  <td>{item.resultTitle || item.resultNote || item.prompt}</td>
                  <td>
                    <div className="admin-inline-actions">
                      {item.linkedContentHref ? (
                        <a className="button secondary" href={item.linkedContentHref}>
                          Abrir borrador
                        </a>
                      ) : (
                        <span>{item.linkedContent || "-"}</span>
                      )}
                      <a className="button secondary" href={item.reuseBriefHref}>
                        Reutilizar brief
                      </a>
                    </div>
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
