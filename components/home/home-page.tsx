/*
 * THESIS: Una portada clínica compacta que se lee como la primera plana de una revista médica.
 * OWN-WORLD: Jardín editorial, marfil cálido, verde profundo, oro contenido y grabados botánicos.
 * STORY: Presentación, caso destacado, actualidad y dos recorridos de continuidad en un solo viewport.
 * FIRST VIEWPORT: Hero fotográfico de proporción panorámica seguido por módulos editoriales densos.
 * FORM: Clinical library folio · faithful mockup reconstruction · seed c322d667.
 */

import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  Compass,
  Leaf,
  NewspaperClipping,
  Stethoscope
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/layout/site-header";
import {
  ClinicalCasesLiveUpdates,
  NewsLiveUpdates
} from "@/components/editorial/clinical-cases-live-updates";
import { getPublishedClinicalCases } from "@/lib/content/cases";
import { getPublishedNewsItems } from "@/lib/content/news";
import {
  medicalWebPageJsonLd,
  physicianJsonLd,
  websiteJsonLd
} from "@/lib/seo";
import styles from "./home-redesign.module.css";

const topics = [
  { href: "/casos-clinicos", label: "Casos", icon: Stethoscope },
  { href: "/noticias", label: "Actualidad", icon: NewspaperClipping },
  { href: "/investigacion", label: "Evidencia", icon: BookOpenText },
  {
    href: "/orientacion-oncologica-remota",
    label: "Orientación",
    icon: Compass
  }
] as const;

function formatPublicationDate(value: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(value);
}

function formatCompactPublicationDate(value: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(value);
}

export async function HomePage() {
  const [publishedCases, newsItems] = await Promise.all([
    getPublishedClinicalCases().then((items) => items.slice(0, 3)),
    getPublishedNewsItems({ limit: 3 })
  ]);
  const featuredCase = publishedCases[0];
  const relatedCases = publishedCases.slice(1);
  const jsonLd = [
    physicianJsonLd,
    websiteJsonLd(),
    medicalWebPageJsonLd({
      path: "/",
      name: "Dr. Antonio Camargo, oncólogo clínico en Lima",
      description:
        "Casos clínicos, actualidad oncológica, investigación y orientación médica explicados con rigor y contexto."
    })
  ];

  return (
    <>
      <ClinicalCasesLiveUpdates />
      <NewsLiveUpdates />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="home-title">
          <Image
            className={styles.heroImage}
            src="/home-hero-wide.png"
            alt="Dr. Antonio Camargo en su biblioteca médica"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 1456px"
          />
          <div className={styles.heroOverlay} aria-hidden="true" />
          <Image
            className={styles.heroBotanical}
            src="/botanical-branch-transparent.png"
            alt=""
            width={720}
            height={410}
            aria-hidden="true"
          />

          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>Oncología clínica · Lima</p>
            <h1 id="home-title">Criterio clínico para comprender y decidir mejor.</h1>
            <p className={styles.heroText}>
              Casos clínicos, evidencia rigurosa y reflexión editorial para
              acompañar decisiones clínicas con claridad, humanidad y propósito.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="/casos-clinicos">
                Leer casos clínicos
              </a>
              <a className={styles.secondaryLink} href="/sobre-mi">
                Conocer al doctor <ArrowRight size={15} weight="regular" />
              </a>
            </div>
          </div>

          <nav className={styles.topicRail} aria-label="Explorar por tema">
            {topics.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href}>
                <Icon size={18} weight="regular" aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </section>

        <div className={styles.editorialBody}>
          <section className={styles.featuredSection} aria-labelledby="featured-title">
            <header className={styles.sectionTitle}>
              <span aria-hidden="true" />
              <h2 id="featured-title">Caso clínico destacado</h2>
            </header>

            <div className={styles.featuredGrid}>
              {featuredCase ? (
                <article className={styles.featuredCase}>
                  <div className={styles.featuredImageWrap}>
                    <img
                      src={featuredCase.featuredImage?.src ?? "/editorial-cancer-cells.png"}
                      alt={featuredCase.featuredImage?.alt ?? "Imagen editorial del caso clínico"}
                      loading="eager"
                    />
                  </div>

                  <div className={styles.featuredCopy}>
                    <time dateTime={(featuredCase.publishedAt ?? featuredCase.updatedAt).toISOString()}>
                      Publicado el {formatPublicationDate(featuredCase.publishedAt ?? featuredCase.updatedAt)}
                    </time>
                    <h3>{featuredCase.title}</h3>
                    <p>{featuredCase.summary}</p>
                    <a href={`/casos-clinicos/${featuredCase.slug}`}>
                      Leer caso completo <ArrowRight size={13} aria-hidden="true" />
                    </a>
                  </div>

                  <div className={styles.relatedCases}>
                    {relatedCases.map((item, index) => (
                      <article key={item.slug}>
                        <div className={styles.relatedImage}>
                          <img
                            src={item.featuredImage?.src ?? (index === 0 ? "/editorial-ct-scan.png" : "/editorial-histology.png")}
                            alt={item.featuredImage?.alt ?? "Imagen editorial del caso clínico"}
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <time dateTime={(item.publishedAt ?? item.updatedAt).toISOString()}>
                            {formatCompactPublicationDate(item.publishedAt ?? item.updatedAt)}
                          </time>
                          <h4>{item.title}</h4>
                          <a href={`/casos-clinicos/${item.slug}`}>
                            Leer resumen <ArrowRight size={12} aria-hidden="true" />
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ) : (
                <article className={styles.featuredEmpty}>
                  <div>
                    <span>Archivo clínico</span>
                    <h3>Los próximos casos aparecerán aquí al publicarse.</h3>
                    <p>El archivo todavía no tiene casos clínicos públicos.</p>
                  </div>
                  <a href="/casos-clinicos">
                    Revisar el archivo <ArrowRight size={13} aria-hidden="true" />
                  </a>
                </article>
              )}

              <article className={styles.reflectionCard}>
                <Image
                  src="/botanical-branch-transparent.png"
                  alt=""
                  fill
                  sizes="380px"
                  aria-hidden="true"
                />
                <div className={styles.reflectionContent}>
                  <div className={styles.reflectionMeta}>
                    <span><Leaf size={16} /> Reflexión editorial</span>
                    <span className={styles.sampleBadge}>Contenido de muestra</span>
                  </div>
                  <h3>El tiempo de la escucha en oncología</h3>
                  <p>Reflexiones sobre el vínculo clínico, las decisiones compartidas y el cuidado que dignifica.</p>
                  <a href="/reflexiones/el-tiempo-de-la-escucha-en-oncologia">
                    Leer reflexión <ArrowRight size={13} />
                  </a>
                </div>
              </article>
            </div>
          </section>

          <section
            id="actualidad"
            className={styles.newsStrip}
            data-news-count={newsItems.length}
            aria-labelledby="news-title"
          >
            <header>
              <h2 id="news-title"><Leaf size={17} /> Actualidad en oncología</h2>
              <span className={styles.latestBadge}>Últimas publicaciones</span>
              <p>Selección editorial de novedades, guías y consensos relevantes.</p>
              <a className={styles.newsArchiveLink} href="/noticias">
                Ver más noticias <ArrowRight size={13} aria-hidden="true" />
              </a>
            </header>
            {newsItems.length > 0 ? (
              newsItems.map((item) => {
                const publicationDate = item.publishedAt ?? item.updatedAt;

                return (
                  <article key={item.slug}>
                    <a className={styles.newsItemLink} href={`/noticias/${item.slug}`}>
                      <span className={styles.newsVisual} aria-hidden="true">
                        {item.featuredImage ? (
                          <img
                            src={item.featuredImage.src}
                            alt=""
                            loading="lazy"
                          />
                        ) : null}
                      </span>
                      <span className={styles.newsCopy}>
                        <h3>{item.title}</h3>
                        <span className={styles.newsMeta}>
                          <time dateTime={publicationDate.toISOString()}>
                            {formatPublicationDate(publicationDate)}
                          </time>
                          {" · Actualidad"}
                        </span>
                      </span>
                    </a>
                  </article>
                );
              })
            ) : (
              <article className={styles.newsEmpty}>
                <h3>Las próximas noticias aparecerán aquí al publicarse.</h3>
                <p>El archivo todavía no tiene noticias públicas.</p>
              </article>
            )}
          </section>

          <section className={styles.bottomGrid} aria-label="Continuar explorando">
            <article className={styles.infoPanel}>
              <Image src="/botanical-branch-transparent.png" alt="" fill sizes="700px" aria-hidden="true" />
              <div>
                <h2><BookOpenText size={18} /> Evidencia que orienta</h2>
                <p>Revisiones breves de estudios y guías clínicas con implicancias prácticas para la consulta diaria.</p>
              </div>
              <a href="/investigacion/como-leer-estudios-y-guias-oncologicas">
                Explorar evidencia <ArrowRight size={13} />
              </a>
            </article>
            <article className={styles.infoPanel}>
              <Image src="/botanical-branch-transparent.png" alt="" fill sizes="700px" aria-hidden="true" />
              <div>
                <div className={styles.infoTitle}>
                  <h2><Compass size={18} /> Orientación a distancia</h2>
                  <span className={styles.sampleBadge}>Contenido de muestra</span>
                </div>
                <p>Acompañamiento profesional para pacientes y familias, donde y cuando lo necesiten.</p>
              </div>
              <a href="/orientacion-oncologica-remota">Conocer más <ArrowRight size={13} /></a>
            </article>
          </section>

          <aside className={styles.disclaimer} aria-label="Aviso médico">
            <strong>Aviso médico</strong>
            <p>
              La información de este sitio es educativa y no reemplaza una consulta médica personalizada,
              un diagnóstico profesional ni una indicación terapéutica individual.
            </p>
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>Dr. Antonio Camargo · Oncología clínica en Lima</span>
        <a href="/login">Acceso profesional</a>
      </footer>
    </>
  );
}
