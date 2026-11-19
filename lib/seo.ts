import type { Metadata } from "next";

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://drantoniocamargo.com"
);

export const siteName = "Dr. Antonio Camargo";
export const doctorName = "Dr. Antonio Camargo";
export const defaultOgImage = "/og-default.jpg";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

/**
 * URL de la imagen para compartir en redes. La imagen general ya es liviana;
 * cualquier otra se sirve recortada a 1200x630 y comprimida por /og-image.
 */
export function shareImageUrl(image: string = defaultOgImage) {
  if (!image || image === defaultOgImage) return defaultOgImage;
  return `/og-image?src=${encodeURIComponent(image)}`;
}

export const baseKeywords = [
  "Dr. Antonio Camargo",
  "oncólogo clínico en Lima",
  "oncología clínica en Lima",
  "consulta oncológica remota",
  "segunda opinión oncológica",
  "oncólogo para pacientes de provincias",
  "orientación oncológica internacional",
  "casos clínicos oncológicos",
  "cáncer en Perú",
  "educación médica oncológica"
];

// Límites prácticos de lo que Google muestra en resultados de búsqueda.
const SEO_TITLE_MAX = 60;
const SEO_TITLE_HARD_MAX = 90;
const SEO_DESCRIPTION_MAX = 155;
const SOCIAL_DESCRIPTION_MAX = 300;

function cutAtWord(text: string, max: number) {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[\s,;:.\-–—|(]+$/, "")}…`;
}

export function toPlainText(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Título para la etiqueta <title>. Si con el sufijo ("| Noticia oncológica")
 * supera ~60 caracteres, se quita el sufijo para que Google muestre lo
 * importante. El título en sí solo se corta si es muy largo (>90), para no
 * perder palabras clave que sí cuentan para el posicionamiento.
 */
export function fitSeoTitle(
  title: string,
  max = SEO_TITLE_MAX,
  hardMax = SEO_TITLE_HARD_MAX
) {
  let current = title.replace(/\s+/g, " ").trim();
  while (current.length > max && current.includes(" | ")) {
    const shorter = current.slice(0, current.lastIndexOf(" | ")).trim();
    if (shorter.length < 35) break;
    current = shorter;
  }
  return cutAtWord(current, current.length > max && current.includes(" | ") ? max : hardMax);
}

/**
 * Descripción breve: texto plano, terminada en una frase completa cuando es
 * posible, o cortada en una palabra completa.
 */
export function fitSeoDescription(text: string, max = SEO_DESCRIPTION_MAX) {
  const plain = toPlainText(text);
  if (plain.length <= max) return plain;
  const slice = plain.slice(0, max);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! ")
  );
  if (sentenceEnd >= max * 0.55) {
    return slice.slice(0, sentenceEnd + 1);
  }
  return cutAtWord(plain, max);
}

export function buildPageMetadata({
  title,
  description,
  path,
  image = defaultOgImage,
  keywords = [],
  type = "website",
  publishedTime,
  modifiedTime
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const shareImage = shareImageUrl(image);
  const metaTitle = fitSeoTitle(title);
  const metaDescription = fitSeoDescription(description);
  const socialDescription = fitSeoDescription(description, SOCIAL_DESCRIPTION_MAX);
  const openGraphBase = {
    title,
    description: socialDescription,
    url: path,
    siteName,
    locale: "es_PE",
    images: [
      {
        url: shareImage,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: title
      }
    ]
  };

  return {
    title: {
      absolute: metaTitle
    },
    description: metaDescription,
    keywords: [...baseKeywords, ...keywords],
    alternates: {
      canonical: path
    },
    openGraph:
      type === "article"
        ? {
            ...openGraphBase,
            type: "article",
            publishedTime,
            modifiedTime,
            authors: [absoluteUrl("/sobre-mi")]
          }
        : {
            ...openGraphBase,
            type: "website"
          },
    twitter: {
      card: "summary_large_image",
      title,
      description: socialDescription,
      images: [shareImage]
    }
  };
}

export const physicianJsonLd = {
  "@context": "https://schema.org",
  "@type": "Physician",
  "@id": absoluteUrl("/sobre-mi#physician"),
  name: doctorName,
  image: absoluteUrl(defaultOgImage),
  medicalSpecialty: ["Oncology", "MedicalOncology"],
  description:
    "Médico oncólogo en Lima, Perú, con orientación clínica presencial y remota para pacientes de provincias y del extranjero.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Lima",
    addressCountry: "PE"
  },
  areaServed: [
    { "@type": "City", name: "Lima" },
    { "@type": "Country", name: "Perú" },
    { "@type": "AdministrativeArea", name: "Provincias del Perú" },
    { "@type": "Place", name: "Atención remota internacional" }
  ],
  availableService: [
    {
      "@type": "MedicalProcedure",
      name: "Orientación oncológica clínica"
    },
    {
      "@type": "MedicalProcedure",
      name: "Segunda opinión oncológica"
    },
    {
      "@type": "MedicalProcedure",
      name: "Revisión de casos clínicos oncológicos"
    }
  ],
  url: absoluteUrl("/sobre-mi")
};

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteName,
    url: absoluteUrl("/"),
    inLanguage: "es-PE",
    publisher: {
      "@id": absoluteUrl("/sobre-mi#physician")
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/buscar")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function medicalWebPageJsonLd({
  path,
  name,
  description
}: {
  path: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": absoluteUrl(`${path}#webpage`),
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: "es-PE",
    about: {
      "@id": absoluteUrl("/sobre-mi#physician")
    },
    reviewedBy: {
      "@id": absoluteUrl("/sobre-mi#physician")
    },
    medicalAudience: [
      { "@type": "MedicalAudience", audienceType: "Patient" },
      { "@type": "MedicalAudience", audienceType: "Physician" }
    ],
    specialty: "Oncology"
  };
}

export function articleJsonLd({
  path,
  headline,
  description,
  datePublished,
  dateModified,
  articleSection,
  keywords = [],
  image = defaultOgImage,
  type = "MedicalScholarlyArticle"
}: {
  path: string;
  headline: string;
  description: string;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  articleSection: string;
  keywords?: string[];
  image?: string;
  type?: "MedicalScholarlyArticle" | "NewsArticle";
}) {
  const published = datePublished
    ? new Date(datePublished).toISOString()
    : undefined;
  const modified = dateModified
    ? new Date(dateModified).toISOString()
    : published;

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": absoluteUrl(`${path}#article`),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(path)
    },
    url: absoluteUrl(path),
    // Google recomienda titulares de hasta 110 caracteres en datos estructurados.
    headline: cutAtWord(headline.replace(/\s+/g, " ").trim(), 110),
    description: fitSeoDescription(description, SOCIAL_DESCRIPTION_MAX),
    image: [absoluteUrl(image)],
    thumbnailUrl: absoluteUrl(image),
    inLanguage: "es-PE",
    isAccessibleForFree: true,
    articleSection,
    keywords,
    datePublished: published,
    dateModified: modified,
    author: {
      "@id": absoluteUrl("/sobre-mi#physician")
    },
    publisher: {
      "@id": absoluteUrl("/sobre-mi#physician")
    },
    reviewedBy: {
      "@id": absoluteUrl("/sobre-mi#physician")
    },
    about: {
      "@id": absoluteUrl("/sobre-mi#physician")
    }
  };
}

export function breadcrumbJsonLd(
  items: Array<{
    name: string;
    path: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function articleMetadata({
  title,
  description,
  path,
  keywords = [],
  image = defaultOgImage,
  datePublished,
  dateModified
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
}) {
  return buildPageMetadata({
    title,
    description,
    path,
    image,
    keywords,
    type: "article",
    publishedTime: datePublished ? new Date(datePublished).toISOString() : undefined,
    modifiedTime: dateModified ? new Date(dateModified).toISOString() : undefined
  });
}
