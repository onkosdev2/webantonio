/*
 * THESIS: Cada categoría es la mesa de contenidos de una misma revista clínica.
 * OWN-WORLD: Hero verde biblioteca, fotografía editorial, marfil y líneas botánicas.
 * STORY: El lector reconoce la sección, filtra el archivo y entra a una lectura sin perder contexto.
 * FIRST VIEWPORT: Hero compacto con título, propósito, volumen publicado y navegación transversal.
 * FORM: Índice editorial del jardín visual establecido.
 */

import Image from "next/image";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/layout/site-header";
import type { PublicPublicationDate } from "@/lib/content/public-dates";
import { EditorialTopicNav } from "./editorial-topic-nav";
import { PublicationDateTime } from "./publication-date-time";
import styles from "./public-collection-page.module.css";

type PublicCollectionItem = {
  href: string;
  title: string;
  summary: string;
  eyebrow?: string;
  image?: {
    src: string;
    alt: string;
  } | null;
  publicationDate?: PublicPublicationDate | null;
  meta?: Array<string | { label: string; href?: string }>;
};

type PublicFilterConfig = {
  label: string;
  name: string;
  options: Array<string | { value: string; label: string }>;
  value?: string;
};

type PublicCollectionPageProps = {
  kicker: string;
  title: string;
  description: string;
  signature: string;
  countLabel: string;
  itemCount: number;
  items: PublicCollectionItem[];
  emptyTitle: string;
  emptyCopy: string;
  searchAction?: string;
  searchQuery?: string;
  filters?: PublicFilterConfig[];
  clearHref?: string;
};

function getSectionPresentation(title: string, searchAction?: string) {
  const value = `${searchAction ?? ""} ${title}`.toLowerCase();

  if (value.includes("casos")) {
    return { href: "/casos-clinicos", image: "/editorial-cancer-cells.png", label: "Archivo clínico" };
  }
  if (value.includes("noticias")) {
    return { href: "/noticias", image: "/editorial-ct-scan.png", label: "Actualidad" };
  }
  if (value.includes("investig")) {
    return { href: "/investigacion", image: "/editorial-histology.png", label: "Evidencia" };
  }
  if (value.includes("reflex")) {
    return { href: "/reflexiones", image: "/home-hero-wide.png", label: "Reflexiones" };
  }

  return { href: undefined, image: "/home-hero-wide.png", label: "Archivo editorial" };
}

export function PublicCollectionPage({
  kicker,
  title,
  description,
  signature,
  countLabel,
  itemCount,
  items,
  emptyTitle,
  emptyCopy,
  searchAction,
  searchQuery = "",
  filters = [],
  clearHref
}: PublicCollectionPageProps) {
  const section = getSectionPresentation(title, searchAction);

  return (
    <>
      <SiteHeader />

      <main className={styles.page}>
        <section className={styles.shell}>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>{kicker}</p>
              <h1>{title}</h1>
              <p className={styles.description}>{description}</p>
              <div className={styles.heroMeta}>
                <strong>{itemCount}</strong>
                <span>{countLabel}</span>
                <i aria-hidden="true" />
                <p>{signature}</p>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <Image
                src={section.image}
                alt=""
                fill
                priority
                sizes="(max-width: 760px) 100vw, 480px"
                aria-hidden="true"
              />
              <span>{section.label}</span>
            </div>

            <div className={styles.heroNav}>
              <EditorialTopicNav activeHref={section.href} />
            </div>
          </div>
        </section>

        <section className={`${styles.shell} ${styles.archive}`} aria-labelledby="archive-title">
          <header className={styles.archiveHeader}>
            <div>
              <p>Archivo publicado</p>
              <h2 id="archive-title">Lecturas para comprender con contexto</h2>
            </div>
            <span>{itemCount} {itemCount === 1 ? "entrada visible" : "entradas visibles"}</span>
          </header>

          {searchAction ? (
            <form action={searchAction} className={styles.filterBar}>
              <label className={styles.searchField}>
                <span>Buscar en archivo</span>
                <div>
                  <MagnifyingGlass size={17} aria-hidden="true" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder="Pulmón, EGFR, inmunoterapia..."
                  />
                </div>
              </label>

              {filters.map((filter) => (
                <label key={filter.name} className={styles.filterField}>
                  <span>{filter.label}</span>
                  <select name={filter.name} defaultValue={filter.value ?? ""}>
                    <option value="">Todos</option>
                    {filter.options.map((option) => (
                      <option
                        key={typeof option === "string" ? option : option.value}
                        value={typeof option === "string" ? option : option.value}
                      >
                        {typeof option === "string" ? option : option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <div className={styles.filterActions}>
                <button type="submit">Aplicar filtros</button>
                {clearHref ? <a href={clearHref}>Limpiar</a> : null}
              </div>
            </form>
          ) : null}

          {items.length > 0 ? (
            <div className={styles.cardGrid}>
              {items.map((item) => (
                <article
                  key={item.href}
                  className={`${styles.card} ${styles.cardWithImage}`}
                >
                  <a
                    className={`${styles.cardVisualTitle}${item.image ? "" : ` ${styles.cardVisualFallback}`}`}
                    href={item.href}
                  >
                    {item.image ? (
                      <img
                        src={item.image.src}
                        alt=""
                        loading="lazy"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className={styles.cardVisualOverlay} aria-hidden="true" />
                    <span className={styles.cardVisualCopy}>
                      {item.eyebrow ? <span className={styles.cardKicker}>{item.eyebrow}</span> : null}
                      <h3
                        className={
                          item.title.length > 124
                            ? styles.cardTitleDense
                            : item.title.length > 100
                              ? styles.cardTitleLong
                              : undefined
                        }
                      >
                        {item.title}
                      </h3>
                    </span>
                  </a>
                  <p>{item.summary}</p>

                  {item.publicationDate ? (
                    <PublicationDateTime value={item.publicationDate} variant="card" />
                  ) : null}

                  {item.meta && item.meta.length > 0 ? (
                    <div className={styles.cardMeta}>
                      {item.meta.map((metaItem) => (
                        typeof metaItem === "string" ? (
                          <span key={metaItem}>{metaItem}</span>
                        ) : metaItem.href ? (
                          <a key={`${metaItem.label}-${metaItem.href}`} href={metaItem.href}>
                            {metaItem.label}
                          </a>
                        ) : (
                          <span key={metaItem.label}>{metaItem.label}</span>
                        )
                      ))}
                    </div>
                  ) : null}

                  <a className={styles.cardLink} href={item.href}>
                    Leer entrada <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <article className={styles.emptyState}>
              <span>Archivo en preparación</span>
              <h3>{emptyTitle}</h3>
              <p>{emptyCopy}</p>
            </article>
          )}
        </section>
      </main>
    </>
  );
}
