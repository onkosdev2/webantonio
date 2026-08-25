import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  Compass,
  ShieldCheck
} from "@phosphor-icons/react/dist/ssr";
import { EditorialTopicNav } from "@/components/editorial/editorial-topic-nav";
import { SiteHeader } from "@/components/layout/site-header";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  medicalWebPageJsonLd,
  physicianJsonLd
} from "@/lib/seo";
import styles from "./orientation.module.css";

const pagePath = "/orientacion-oncologica-remota";

export const metadata: Metadata = buildPageMetadata({
  title: "Orientación Oncológica Remota desde Lima | Dr. Antonio Camargo",
  description:
    "Orientación oncológica desde Lima para pacientes de provincias del Perú y personas en el extranjero que buscan una segunda mirada médica.",
  path: pagePath,
  keywords: [
    "orientación oncológica remota",
    "segunda opinión oncológica",
    "oncólogo remoto Perú",
    "oncólogo en Lima para provincias",
    "consulta oncológica internacional"
  ]
});

const scopeItems = [
  "Revisión ordenada de diagnóstico, biopsia, imágenes, estadiaje y tratamientos recibidos.",
  "Orientación para pacientes fuera de Lima que necesitan entender opciones antes de viajar.",
  "Segunda mirada clínica para peruanos en provincias o pacientes en el extranjero.",
  "Preparación de preguntas y prioridades para la consulta presencial o el equipo tratante."
];

const limits = [
  "No reemplaza emergencias ni atención hospitalaria inmediata.",
  "No sustituye la evaluación presencial cuando el caso requiere examen físico, procedimiento o tratamiento activo.",
  "Las recomendaciones dependen de la calidad y completitud de los informes enviados."
];

export default function RemoteOncologyOrientationPage() {
  const jsonLd = [
    physicianJsonLd,
    medicalWebPageJsonLd({
      path: pagePath,
      name: "Orientación oncológica remota desde Lima",
      description:
        "Página informativa sobre orientación oncológica remota desde Lima para pacientes de provincias del Perú y del extranjero."
    }),
    {
      "@context": "https://schema.org",
      "@type": "MedicalBusiness",
      "@id": absoluteUrl(`${pagePath}#remote-oncology`),
      name: "Orientación oncológica remota - Dr. Antonio Camargo",
      url: absoluteUrl(pagePath),
      medicalSpecialty: "Oncology",
      areaServed: [
        { "@type": "City", name: "Lima" },
        { "@type": "Country", name: "Perú" },
        { "@type": "AdministrativeArea", name: "Provincias del Perú" },
        { "@type": "Place", name: "Pacientes internacionales" }
      ],
      provider: { "@id": absoluteUrl("/sobre-mi#physician") }
    },
    breadcrumbJsonLd([
      { name: "Inicio", path: "/" },
      { name: "Orientación oncológica remota", path: pagePath }
    ])
  ];

  return (
    <>
      {jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <SiteHeader />

      <main className={styles.page}>
        <section className={styles.shell}>
          <div className={styles.hero}>
            <Image
              className={styles.heroImage}
              src="/home-hero-wide.png"
              alt="Dr. Antonio Camargo en su biblioteca médica"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 1392px"
            />
            <div className={styles.heroOverlay} aria-hidden="true" />

            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Oncología desde Lima</p>
              <h1>Una segunda mirada para ordenar el siguiente paso.</h1>
              <p>
                Orientación clínica para pacientes en provincias o en el extranjero
                que necesitan comprender mejor su información antes de decidir.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryAction} href="/sobre-mi">
                  Conocer trayectoria <ArrowRight size={15} aria-hidden="true" />
                </a>
                <a className={styles.secondaryAction} href="/casos-clinicos">
                  Revisar casos clínicos
                </a>
              </div>
            </div>

            <aside className={styles.heroNote}>
              <Compass size={24} aria-hidden="true" />
              <span>Lima + remoto</span>
              <strong>Contexto clínico, lectura crítica y orientación clara.</strong>
            </aside>

            <div className={styles.heroNav}>
              <EditorialTopicNav activeHref={pagePath} />
            </div>
          </div>
        </section>

        <section className={`${styles.shell} ${styles.scopeSection}`} aria-labelledby="scope-title">
          <header className={styles.sectionHeader}>
            <div>
              <p>Qué podemos ordenar</p>
              <h2 id="scope-title">Información dispersa convertida en preguntas útiles.</h2>
            </div>
            <span>
              La orientación empieza por reconstruir el caso con claridad y reconocer
              qué información falta.
            </span>
          </header>

          <div className={styles.scopeGrid}>
            {scopeItems.map((item) => (
              <article key={item}>
                <CheckCircle size={20} aria-hidden="true" />
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.shell} ${styles.claritySection}`}>
          <div className={styles.clarityCopy}>
            <p>Para quién sirve</p>
            <h2>Claridad antes de viajar, consultar o cambiar de etapa.</h2>
            <p>
              Pensada para personas que desean comprender el diagnóstico, contrastar
              una ruta terapéutica o preparar una consulta con información mejor
              organizada. El objetivo es volver visible el razonamiento, no prometer
              respuestas rápidas.
            </p>
            <a href="/sobre-mi">
              Conocer al doctor <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>

          <aside className={styles.limits}>
            <div>
              <ShieldCheck size={23} aria-hidden="true" />
              <span>Límites clínicos</span>
            </div>
            <h2>Una orientación responsable también explica lo que no puede resolver.</h2>
            <ul>
              {limits.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </aside>
        </section>
      </main>
    </>
  );
}
