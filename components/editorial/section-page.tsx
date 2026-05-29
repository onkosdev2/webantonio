import { SiteHeader } from "@/components/layout/site-header";

type SectionPageProps = {
  kicker: string;
  title: string;
  description: string;
  signature?: string;
  highlightA?: string;
  highlightB?: string;
  highlightC?: string;
  visualLabel?: string;
};

export function SectionPage({
  kicker,
  title,
  description,
  signature = "Archivo especializado y curaduria clinica",
  highlightA = "Direccion editorial con criterios de rigor y contexto",
  highlightB = "Taxonomias oncologicas preparadas para IA y MCP",
  highlightC = "Presentacion premium orientada a lectura profunda",
  visualLabel = "Atlas editorial"
}: SectionPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="page-chrome section-shell">
        <section className="shell section-hero-grid">
          <article className="panel section-hero-copy">
            <span className="eyebrow">{kicker}</span>
            <p className="section-signature">{signature}</p>
            <h1 className="section-title">{title}</h1>
            <p className="section-copy">{description}</p>

            <div className="section-note-grid">
              <div className="section-note">{highlightA}</div>
              <div className="section-note">{highlightB}</div>
              <div className="section-note">{highlightC}</div>
            </div>
          </article>

          <aside className="section-hero-visual">
            <div className="section-visual-label">{visualLabel}</div>
            <div className="panel section-visual-panel">
              <img
                className="section-visual-image"
                src="/section-clinical-atlas.svg"
                alt="Composicion editorial abstracta"
              />
            </div>
          </aside>
        </section>

        <section className="shell internal-luxury-grid">
          <article className="internal-card internal-card-dark">
            <span className="kicker">Profundidad</span>
            <h2>Contenido tratado como patrimonio clinico, no como entrada de blog.</h2>
            <p className="section-intro">
              Cada seccion mantiene una presencia visual de revista medica de
              autor, con jerarquia, ritmo editorial y capacidad para escalar a
              casos, noticias, imagenes, comentarios y herramientas MCP.
            </p>
          </article>

          <article className="internal-card internal-card-light">
            <span className="kicker">Experiencia</span>
            <ul className="bullet-list luxe-list">
              <li>Hero propio con atmosfera editorial y clinica</li>
              <li>Tipografia de display para titulares y sans refinada para interfaz</li>
              <li>Plantilla interna consistente con la home premium</li>
            </ul>
          </article>
        </section>
      </main>
    </>
  );
}
