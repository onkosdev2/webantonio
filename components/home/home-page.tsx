import { SiteHeader } from "@/components/layout/site-header";
import { contentSections, platformHighlights } from "@/lib/content/site-config";
import { getPublicHomeFeed } from "@/lib/content/public";

const editorialSignals = [
  "Casos con biomarcadores, toxicidades y decisiones terapeuticas",
  "Radar oncologico continuo con borradores editoriales asistidos",
  "Archivo MCP listo para conectar agentes, apps y asistentes"
] as const;

export async function HomePage() {
  const { counts, latestPublished } = await getPublicHomeFeed();
  const luxuryStats = [
    { value: String(counts.cases).padStart(2, "0"), label: "casos clinicos publicados" },
    { value: String(counts.news).padStart(2, "0"), label: "noticias publicadas" },
    {
      value: String(counts.editorials).padStart(2, "0"),
      label: "editoriales publicadas"
    },
    {
      value: String(counts.research).padStart(2, "0"),
      label: "investigacion publicada"
    }
  ] as const;

  return (
    <>
      <SiteHeader />

      <main className="page-chrome">
        <section className="hero">
          <div className="shell hero-grid">
            <article className="panel hero-copy hero-stage">
              <span className="eyebrow">Plataforma Editorial Oncologica Hibrida</span>
              <p className="hero-lead-line">
                Dr. Antonio Camargo, oncologia clinica, criterio editorial y
                arquitectura MCP.
              </p>
              <h1>Una presencia digital de lujo para pensamiento clinico de alto nivel.</h1>
              <p className="hero-description">
                La web no se presenta como un blog medico convencional. Se
                comporta como una revista clinica de autor: casos oncologicos,
                noticias vigiladas, editoriales, reflexiones y un sistema
                inteligente que produce, clasifica, conecta y conserva tu
                archivo profesional.
              </p>

              <div className="cta-row">
                <a className="button primary" href="/casos-clinicos">
                  Explorar archivo oncologico
                </a>
                <a className="button secondary" href="/sobre-mi">
                  Perfil del Dr. Camargo
                </a>
              </div>

              <div className="signal-strip">
                {editorialSignals.map((signal) => (
                  <span key={signal}>{signal}</span>
                ))}
              </div>

              <div className="hero-art-frame">
                <img
                  className="hero-art"
                  src="/hero-oncology-luxe.svg"
                  alt="Ilustracion editorial abstracta para oncologia"
                />
              </div>
            </article>

            <aside className="hero-aside">
              <section className="panel dossier-panel">
                <div className="dossier-header">
                  <span className="kicker">Edicion Fundacional</span>
                  <span className="dossier-index">Vol. 01</span>
                </div>

                <h2 className="dossier-title">
                  Archivo vivo para oncologia, docencia y criterio medico.
                </h2>

                <p className="card-copy">
                  Casos estructurados, noticias filtradas por impacto clinico,
                  comentario editorial y una capa MCP para conectar asistentes,
                  redactores y automatizaciones externas.
                </p>

                <div className="stats-grid">
                  {luxuryStats.map((item) => (
                    <div key={item.label} className="stat-tile">
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="quote-panel">
                <span className="quote-mark">“</span>
                <p>
                  Una plataforma de autor para explicar el cancer con precision,
                  humanidad y una direccion visual a la altura del contenido.
                </p>
              </section>
            </aside>
          </div>
        </section>

        <section className="shell marquee-band">
          <div>Casos clinicos</div>
          <div>Noticias oncologicas</div>
          <div>Editoriales</div>
          <div>Reflexiones</div>
          <div>Galeria clinica</div>
          <div>Integraciones MCP</div>
        </section>

        <div className="shell grid">
          <section className="section luxe-section">
            <div className="section-heading">
              <span className="eyebrow">Curaduria Editorial</span>
              <h2>Canales que construyen una firma profesional reconocible.</h2>
            </div>

            <div className="cards-3 feature-grid">
              {contentSections.map((section, index) => (
                <article key={section.title} className="section-card feature-card">
                  <span className="feature-index">0{index + 1}</span>
                  <span className="kicker">{section.kicker}</span>
                  <h3 className="card-title">{section.title}</h3>
                  <p className="card-copy">{section.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section split-showcase">
            <article className="showcase-panel showcase-dark">
              <span className="eyebrow">Direccion Visual</span>
              <h2>Menos plantilla, mas revista clinica de autor.</h2>
              <p className="section-intro">
                Materiales suaves, contrastes profundos, acentos de bronce y
                una composicion pensada para transmitir autoridad, delicadeza y
                sofisticacion medica.
              </p>
            </article>

            <article className="showcase-panel showcase-light">
              <span className="kicker">Arquitectura Operativa</span>
              <ul className="bullet-list luxe-list">
                <li>Panel privado para borradores, revision y trazabilidad</li>
                <li>IA para redactar, editar, relacionar y responder</li>
                <li>API y MCP para conectar redactores y rastreadores externos</li>
              </ul>
            </article>
          </section>

          <section className="section luxe-section">
            <div className="section-heading">
              <span className="eyebrow">Sistema Hibrido</span>
              <h2>Una plataforma que publica, coordina y conversa con otras herramientas.</h2>
              <p className="section-intro">
                El valor no esta solo en lo que se ve. Debajo de la capa
                visual, la web queda preparada para operar como centro
                editorial oncológico conectado.
              </p>
            </div>

            <div className="cards-2 architecture-grid">
              {platformHighlights.map((item) => (
                <article key={item.title} className="section-card architecture-card">
                  <span className="kicker">{item.kicker}</span>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-copy">{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section luxe-section">
            <div className="section-heading">
              <span className="eyebrow">Archivo Publicado</span>
              <h2>Lo que ya está visible para el lector en la web pública.</h2>
              <p className="section-intro">
                La portada ya lee piezas publicadas reales desde la base de
                datos. A partir de aquí, el sitio empieza a operar como
                publicación y no solo como presentación.
              </p>
            </div>

            {latestPublished.length > 0 ? (
              <div className="public-card-grid">
                {latestPublished.map((item) => (
                  <article key={item.href} className="public-card">
                    <span className="kicker">{item.kicker}</span>
                    <h3 className="public-card-title">
                      <a href={item.href}>{item.title}</a>
                    </h3>
                    <p className="public-card-copy">{item.summary}</p>
                    <a className="button secondary" href={item.href}>
                      Leer pieza
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <article className="panel public-empty-state">
                <span className="kicker">Sin publicaciones</span>
                <h2>Todavía no hay piezas públicas en portada.</h2>
                <p>
                  Cuando una noticia, editorial o caso cambie a estado
                  PUBLISHED, aparecerá aquí automáticamente.
                </p>
              </article>
            )}
          </section>

        </div>
      </main>

      <footer className="shell footer">
        <span>Dr. Antonio Camargo</span>
        <span>Oncologia, archivo clinico, noticias y pensamiento medico asistido por IA.</span>
      </footer>
    </>
  );
}
