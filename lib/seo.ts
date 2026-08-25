import type { Metadata } from "next";

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://drantoniocamargo.com"
);

export const siteName = "Dr. Antonio Camargo";
export const doctorName = "Dr. Antonio Camargo";
export const defaultOgImage = "/doctor-profile-hero.png";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
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

export function buildPageMetadata({
  title,
  description,
  path,
  image = defaultOgImage,
  keywords = []
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
}): Metadata {
  return {
    title: {
      absolute: title
    },
    description,
    keywords: [...baseKeywords, ...keywords],
    alternates: {
      canonical: path
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName,
      locale: "es_PE",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${doctorName}, oncólogo clínico en Lima`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
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
  keywords = []
}: {
  path: string;
  headline: string;
  description: string;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  articleSection: string;
  keywords?: string[];
}) {
  const published = datePublished
    ? new Date(datePublished).toISOString()
    : undefined;
  const modified = dateModified
    ? new Date(dateModified).toISOString()
    : published;

  return {
    "@context": "https://schema.org",
    "@type": "MedicalScholarlyArticle",
    "@id": absoluteUrl(`${path}#article`),
    mainEntityOfPage: absoluteUrl(path),
    url: absoluteUrl(path),
    headline,
    description,
    image: absoluteUrl(defaultOgImage),
    inLanguage: "es-PE",
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
  keywords = []
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}) {
  return buildPageMetadata({
    title,
    description,
    path,
    keywords
  });
}
