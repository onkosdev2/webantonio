/*
 * THESIS: La cabecera funciona como una lámina de atlas clínico, no como cuatro paneles equivalentes.
 * OWN-WORLD: Marfil editorial, verde botánico, oro contenido y una figura médica tratada como evidencia visual.
 * STORY: El lector identifica el caso, examina la figura y encuentra su contexto en un único recorrido.
 * FIRST VIEWPORT: Título horizontal sobrio arriba; figura dominante y columna de contexto debajo.
 * FORM: Lámina de atlas, estructura local prioritaria; sin semilla por ser una extensión del sistema existente.
 */

import Image from "next/image";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Clock,
  Leaf,
  ShieldCheck
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/layout/site-header";
import type { PublicPublicationDate } from "@/lib/content/public-dates";
import { PublicationDateTime } from "./publication-date-time";
import styles from "./public-article-page.module.css";

type PublicChip = string | { label: string; href?: string };

type PublicArticlePageProps = {
  variant?: "default" | "clinical-case" | "news";
  kicker: string;
  title: string;
  summary: string;
  body: string;
  publicationDate?: PublicPublicationDate | null;
  featuredImage?: { src: string; alt: string; origin?: string } | null;
  backHref: string;
  backLabel: string;
  editHref?: string;
  meta: PublicChip[];
  tags?: PublicChip[];
  relatedItems?: Array<{
    href: string;
    title: string;
    summary: string;
    kicker: string;
    meta?: PublicChip[];
  }>;
  jsonLd?: unknown[];
};

type ArticleBlock =
  | { kind: "heading"; text: string; id: string }
  | { kind: "image"; src: string; caption: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

const IMAGE_MARKDOWN = /^!\[([^\]]*)\]\((\S+?)\)$/;
const IMAGE_URL = /^(https?:\/\/\S+\.(?:png|jpe?g|webp|gif|svg))$/i;
const CLINICAL_SECTION_TITLE = /^(presentaci[oó]n(?: del caso| del caso cl[ií]nico| cl[ií]nica)?|punto de partida|contexto cl[ií]nico|antecedentes(?: cl[ií]nicos)?|abordaje diagn[oó]stico|evaluaci[oó]n diagn[oó]stica|diagn[oó]stico(?::.+)?|estadificaci[oó]n(?: y tratamiento inicial)?|preguntas que organizan el caso|qu[eé] cambia la conducta|decisi[oó]n(?: razonada| terap[eé]utica(?::.+)?)|tratamiento(?: inicial| y evoluci[oó]n)?|evoluci[oó]n(?: cl[ií]nica| y pron[oó]stico)?|progresi[oó]n(?: neurol[oó]gica| de la enfermedad)?|confirmar antes de clasificar|construir una l[ií]nea de base|reevaluar con prop[oó]sito|discusi[oó]n(?: docente)?|señales de alerta y diagn[oó]stico|s[ií]ntomas de alarma e importancia del diagn[oó]stico precoz|manejo cl[ií]nico y señales de alarma|fisiopatolog[ií]a(?::.+)?|discusi[oó]n y prevenci[oó]n integral|recomendaciones para prevenci[oó]n y tamizaje|conclusiones(?: docentes)?|aprendizajes para la pr[aá]ctica|puntos? de aprendizaje|seguimiento(?: [uú]til)?)$/i;

function headingId(text: string, index: number) {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `seccion-${index + 1}`;
}

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    return textFromNode((node as { props?: { children?: ReactNode } }).props?.children);
  }

  return "";
}

function normalizeMarkdownBody(body: string) {
  return body
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      return IMAGE_URL.test(trimmed) ? `![Imagen editorial](${trimmed})` : block;
    })
    .join("\n\n");
}

function omitFirstMatchingImage(body: string, src: string) {
  let removed = false;

  return body
    .split(/\n{2,}/)
    .filter((block) => {
      if (removed) {
        return true;
      }

      const trimmed = block.trim();
      const markdownImage = trimmed.match(IMAGE_MARKDOWN);
      if (markdownImage?.[2] === src || trimmed === src) {
        removed = true;
        return false;
      }

      return true;
    })
    .join("\n\n");
}

function clinicalHeadingText(block: string) {
  const trimmed = block.trim();
  const escapedBold = trimmed.match(/^\\\*\\\*(.+?)\\\*\\\*$/);
  const markdownBold = trimmed.match(/^\*\*(.+?)\*\*$/);
  const candidate = (escapedBold?.[1] ?? markdownBold?.[1] ?? trimmed)
    .replace(/\s+/g, " ")
    .trim();

  if (trimmed.startsWith("## ")) {
    return trimmed.slice(3).trim();
  }

  if (escapedBold || markdownBold || CLINICAL_SECTION_TITLE.test(candidate)) {
    return candidate;
  }

  return null;
}

function normalizeClinicalMarkdownBody(body: string) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = clinicalHeadingText(block);
      return heading ? `## ${heading}` : block;
    });

  if (blocks.some((block) => block.startsWith("## "))) {
    return blocks.join("\n\n");
  }

  const proseIndexes = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) =>
      !block.startsWith("![") &&
      !block.startsWith(">") &&
      !block.startsWith("-") &&
      !block.startsWith("|")
    )
    .map(({ index }) => index);

  if (proseIndexes.length < 3) {
    return blocks.join("\n\n");
  }

  const sectionLabels = new Map<number, string>([
    [proseIndexes[0], "Presentación clínica"],
    [proseIndexes[Math.floor(proseIndexes.length / 2)], "Evaluación y razonamiento clínico"],
    [proseIndexes.at(-1)!, "Implicaciones para la práctica"]
  ]);

  return blocks
    .flatMap((block, index) => {
      const label = sectionLabels.get(index);
      return label ? [`## ${label}`, block] : [block];
    })
    .join("\n\n");
}

function parseBody(body: string): ArticleBlock[] {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const markdownImage = block.match(IMAGE_MARKDOWN);
      if (markdownImage) {
        return { kind: "image", src: markdownImage[2], caption: markdownImage[1] ?? "" };
      }

      if (IMAGE_URL.test(block)) {
        return { kind: "image", src: block, caption: "" };
      }

      if (block.startsWith("## ")) {
        const text = block.slice(3).trim();
        return { kind: "heading", text, id: headingId(text, index) };
      }

      if (block.startsWith("> ")) {
        return { kind: "quote", text: block.slice(2).trim() };
      }

      const lines = block.split("\n").map((line) => line.trim());
      if (lines.every((line) => line.startsWith("- "))) {
        return { kind: "list", items: lines.map((line) => line.slice(2).trim()) };
      }

      return { kind: "paragraph", text: block };
    });
}

function renderChip(chip: PublicChip) {
  if (typeof chip === "string") {
    return <span key={chip}>{chip}</span>;
  }

  if (chip.href) {
    return (
      <a key={`${chip.label}-${chip.href}`} href={chip.href}>
        {chip.label}
      </a>
    );
  }

  return <span key={chip.label}>{chip.label}</span>;
}

export function PublicArticlePage({
  variant = "default",
  kicker,
  title,
  summary,
  body,
  publicationDate,
  featuredImage,
  backHref,
  backLabel,
  editHref,
  meta,
  tags = [],
  relatedItems = [],
  jsonLd = []
}: PublicArticlePageProps) {
  const isClinicalCase = variant === "clinical-case";
  const usesAtlasLayout = variant === "clinical-case" || variant === "news";
  const titleSeparatorIndex = usesAtlasLayout ? title.indexOf(":") : -1;
  const hasTitleDeck = titleSeparatorIndex > 0;
  const titleLead = hasTitleDeck ? title.slice(0, titleSeparatorIndex) : title;
  const titleDeck = hasTitleDeck
    ? title.slice(titleSeparatorIndex + 1).trim()
    : "";
  const titleDeckDisplay = titleDeck
    ? `${titleDeck.charAt(0).toUpperCase()}${titleDeck.slice(1)}`
    : "";
  const isLongTitle = usesAtlasLayout && title.length > 90;
  const normalizedSourceBody = isClinicalCase
    ? normalizeClinicalMarkdownBody(normalizeMarkdownBody(body))
    : normalizeMarkdownBody(body);
  const normalizedBody = usesAtlasLayout && featuredImage
    ? omitFirstMatchingImage(normalizedSourceBody, featuredImage.src)
    : normalizedSourceBody;
  const blocks = parseBody(normalizedBody);
  const sections = blocks.filter(
    (block): block is Extract<ArticleBlock, { kind: "heading" }> =>
      block.kind === "heading"
  );
  const readingMinutes = Math.max(3, Math.ceil(body.split(/\s+/).length / 190));
  const atlasHeroImage = usesAtlasLayout
    ? featuredImage ?? (isClinicalCase
        ? {
            src: "/section-clinical-atlas.svg",
            alt: "Composición editorial del archivo de casos clínicos"
          }
        : {
            src: "/editorial-ct-scan.png",
            alt: "Composición editorial de actualidad oncológica"
          })
    : null;
  const readingGuide = (
    <aside
      className={`${styles.readingCard}${usesAtlasLayout ? ` ${styles.clinicalReadingCard}` : ""}`}
      aria-label="Ficha de lectura"
    >
      <Image
        className={styles.readingBotanical}
        src="/botanical-branch-transparent.png"
        alt=""
        fill
        sizes="300px"
        aria-hidden="true"
      />
      <div>
        <BookOpenText size={22} aria-hidden="true" />
        <span>Ficha de lectura</span>
      </div>
      <strong>Contexto antes que conclusiones.</strong>
      <p>
        Recorra la pregunta, la evidencia y sus límites antes de trasladarla
        a una decisión individual.
      </p>
      <span className={styles.readingTime}>
        <Clock size={16} aria-hidden="true" />
        {readingMinutes} min de lectura
      </span>
    </aside>
  );

  return (
    <>
      {jsonLd.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <SiteHeader editHref={editHref} />

      <main className={`${styles.page}${usesAtlasLayout ? ` ${styles.clinicalPage}` : ""}`}>
        <div className={styles.shell}>
          <nav className={styles.contextBar} aria-label="Ruta de navegación">
            <a href={backHref}>
              <ArrowLeft size={16} aria-hidden="true" />
              {backLabel}
            </a>
            <span aria-hidden="true" />
            <p>{kicker}</p>
          </nav>

          <article className={`${styles.article}${usesAtlasLayout ? ` ${styles.clinicalArticle}` : ""}${variant === "news" ? ` ${styles.newsArticle}` : ""}`}>
            <header className={`${styles.articleHeader}${usesAtlasLayout ? ` ${styles.clinicalHeader}` : ""}`}>
              <div className={styles.headerCopy}>
                <p className={styles.kicker}>
                  <Leaf size={17} aria-hidden="true" />
                  {kicker}
                </p>
                {publicationDate ? (
                  <PublicationDateTime value={publicationDate} variant="article" />
                ) : null}
                <h1
                  className={isLongTitle ? styles.longTitle : undefined}
                  aria-label={title}
                >
                  <span className={styles.titleLead}>{titleLead}</span>
                  {titleDeckDisplay ? (
                    <span className={styles.titleDeck}>{titleDeckDisplay}</span>
                  ) : null}
                </h1>
                {!usesAtlasLayout ? (
                  <>
                    <p className={styles.summary}>{summary}</p>
                    {meta.length > 0 ? (
                      <div className={styles.metaRow}>
                        {meta.map(renderChip)}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              {atlasHeroImage ? (
                <figure className={styles.clinicalHeroVisual}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={atlasHeroImage.src} alt={atlasHeroImage.alt} />
                  <figcaption>
                    <span>
                      {isClinicalCase
                        ? "Figura educativa del caso"
                        : "Ilustración editorial de la noticia"}
                    </span>
                    {['openai', 'nvidia'].includes(atlasHeroImage.origin ?? '') ? (
                      <small>Generada con IA · no corresponde a un estudio real</small>
                    ) : null}
                  </figcaption>
                </figure>
              ) : readingGuide}

              {usesAtlasLayout ? (
                <div className={styles.clinicalSynopsis}>
                  <div className={styles.clinicalSynopsisCopy}>
                    <p className={styles.summary}>{summary}</p>
                    {meta.length > 0 ? (
                      <div className={styles.metaRow}>
                        {meta.map(renderChip)}
                      </div>
                    ) : null}
                  </div>
                  {readingGuide}
                </div>
              ) : null}
            </header>

            {featuredImage && !usesAtlasLayout ? (
              <figure className={styles.featuredImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredImage.src} alt={featuredImage.alt} />
                <figcaption>
                  Ilustración editorial
                  {["openai", "nvidia"].includes(featuredImage.origin ?? "")
                    ? " · Generada con IA"
                    : ""}
                </figcaption>
              </figure>
            ) : null}

            <div className={styles.articleBody}>
              <div className={styles.prose}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <h2 id={headingId(textFromNode(children), 0)}>{children}</h2>
                    ),
                    img: ({ src, alt }) => (
                      <span className={styles.figure}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src || ""} alt={alt || ""} loading="lazy" />
                        {alt ? <span className={styles.figureCaption}>{alt}</span> : null}
                      </span>
                    ),
                    blockquote: ({ children }) => (
                      <aside className={styles.sampleNotice}>
                        <ShieldCheck size={22} aria-hidden="true" />
                        <div>{children}</div>
                      </aside>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target={href?.startsWith("http") ? "_blank" : undefined}
                        rel={href?.startsWith("http") ? "noreferrer" : undefined}
                      >
                        {children}
                      </a>
                    )
                  }}
                >
                  {normalizedBody}
                </ReactMarkdown>
              </div>

              <aside className={styles.readingRail}>
                {sections.length > 0 ? (
                  <nav aria-label="En esta lectura">
                    <p>En esta lectura</p>
                    {sections.map((section) => (
                      <a key={section.id} href={`#${section.id}`}>
                        {section.text}
                      </a>
                    ))}
                  </nav>
                ) : null}

                <div className={styles.medicalNote}>
                  <ShieldCheck size={20} aria-hidden="true" />
                  <div>
                    <strong>Alcance educativo</strong>
                    <p>
                      Esta lectura no reemplaza valoración médica, diagnóstico ni
                      indicación terapéutica individual.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            <footer className={styles.articleFooter}>
              <div>
                <span>Archivo editorial</span>
                <p>Oncología explicada con contexto, prudencia y trazabilidad.</p>
              </div>

              {tags.length > 0 ? (
                <div className={styles.tags} aria-label="Temas relacionados">
                  {tags.map((tag) =>
                    typeof tag === "string" ? (
                      <span key={tag}>{tag}</span>
                    ) : tag.href ? (
                      <a key={`${tag.label}-${tag.href}`} href={tag.href}>{tag.label}</a>
                    ) : (
                      <span key={tag.label}>{tag.label}</span>
                    )
                  )}
                </div>
              ) : null}
            </footer>
          </article>

          {relatedItems.length > 0 ? (
            <section className={styles.relatedSection} aria-labelledby="related-title">
              <header>
                <p>Continuar en contexto</p>
                <h2 id="related-title">Lecturas conectadas con esta entrada</h2>
              </header>

              <div className={styles.relatedGrid}>
                {relatedItems.map((item) => (
                  <article key={item.href}>
                    <span>{item.kicker}</span>
                    <h3><a href={item.href}>{item.title}</a></h3>
                    <p>{item.summary}</p>
                    {item.meta && item.meta.length > 0 ? (
                      <div className={styles.relatedMeta}>
                        {item.meta.slice(0, 2).map(renderChip)}
                      </div>
                    ) : null}
                    <a className={styles.relatedLink} href={item.href}>
                      Leer entrada <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
