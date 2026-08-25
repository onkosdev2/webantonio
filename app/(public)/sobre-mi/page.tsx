import type { Metadata } from "next";
import { SectionPage } from "@/components/editorial/section-page";
import {
  buildPageMetadata,
  medicalWebPageJsonLd,
  physicianJsonLd
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sobre el Dr. Antonio Camargo | Oncólogo Clínico en Lima",
  description:
    "Conoce la trayectoria, enfoque clínico y labor educativa del Dr. Antonio Camargo, oncólogo clínico en Lima con orientación remota para pacientes de provincias y otros países.",
  path: "/sobre-mi",
  keywords: [
    "sobre Dr Antonio Camargo",
    "oncólogo médico Lima",
    "ONKOS",
    "orientación oncológica remota"
  ]
});

export default function SobreMiPage() {
  const jsonLd = [
    physicianJsonLd,
    medicalWebPageJsonLd({
      path: "/sobre-mi",
      name: "Sobre el Dr. Antonio Camargo",
      description:
        "Perfil profesional del Dr. Antonio Camargo, oncólogo clínico en Lima con orientación presencial y remota para pacientes de Perú y del extranjero."
    })
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SectionPage
        kicker="Perfil Médico"
        title="Dr. Antonio Camargo"
        description="Médico oncólogo peruano especializado en el diagnóstico, tratamiento y seguimiento integral de pacientes con cáncer. Desarrolla su práctica en Lima y ofrece orientación remota para pacientes de provincias y del extranjero cuando el caso lo permite."
        signature="Oncología médica en Lima, medicina personalizada y cuidado integral"
        highlightA="Más de 14 años de experiencia en oncología médica"
        highlightB="Atención desde Lima y orientación remota para provincias"
        highlightC="Experiencia en quimioterapia, terapias dirigidas e inmunoterapia"
        visualLabel="Perfil del doctor"
        visualSrc="/doctor-profile-hero.png"
        visualAlt="Dr. Antonio Camargo en su consultorio"
        visualFit="cover"
        depthKicker="Trayectoria"
        depthTitle="Una práctica médica centrada en precisión terapéutica, innovación y acompañamiento."
        depthCopy="El Dr. Antonio Camargo desarrolla su labor como oncólogo médico en Lima, Perú. Acompaña a sus pacientes desde la evaluación diagnóstica hasta la planificación del tratamiento y el seguimiento clínico, integrando información médica, objetivos terapéuticos y contexto personal de cada caso. Como fundador de ONKOS, impulsa una atención oncológica especializada, moderna y cercana al paciente."
        detailsKicker="Formación y experiencia"
        detailItems={[
          "Médico oncólogo con amplia experiencia en el tratamiento médico del cáncer.",
          "Médico cirujano con formación vinculada a la Universidad Nacional Federico Villarreal.",
          "Fundador de ONKOS, centro dedicado a la atención integral de pacientes oncológicos.",
          "Formación complementaria y actualización profesional en oncología, con participación en espacios académicos y científicos internacionales."
        ]}
        profileSections={[
          {
            kicker: "Áreas clínicas",
            title: "Tumores y tratamientos",
            copy:
              "Su actividad clínica incluye la atención de pacientes con cáncer de mama, cáncer de pulmón, cáncer colorrectal y linfomas. Evalúa cada caso de forma individual para definir estrategias de tratamiento como quimioterapia, terapias dirigidas e inmunoterapia cuando están indicadas."
          },
          {
            kicker: "Lima y remoto",
            title: "Orientación para Lima, provincias y pacientes internacionales",
            copy:
              "Su trabajo se desarrolla desde Lima, Perú, con posibilidad de orientación remota para pacientes de provincias y personas que buscan una segunda mirada médica desde el extranjero, siempre dentro de los límites clínicos y regulatorios aplicables."
          },
          {
            kicker: "Medicina personalizada",
            title: "Decisiones basadas en diagnóstico, biomarcadores y contexto",
            copy:
              "Su enfoque prioriza comprender el tipo de tumor, el estadio de la enfermedad, los biomarcadores disponibles y las condiciones generales del paciente. Esta visión permite orientar tratamientos más precisos, explicar beneficios y riesgos, y sostener decisiones clínicas informadas."
          },
          {
            kicker: "Acompañamiento",
            title: "Comunicación clara para pacientes y familias",
            copy:
              "Una parte central de su práctica es explicar el diagnóstico y las alternativas terapéuticas con claridad. El acompañamiento médico busca que el paciente y su familia comprendan el proceso, participen en las decisiones y mantengan seguimiento continuo durante el tratamiento."
          },
          {
            kicker: "Divulgación médica",
            title: "Educación oncológica y comunicación pública",
            copy:
              "Además de su labor asistencial, el Dr. Camargo participa en iniciativas de educación y divulgación sobre cáncer, acercando información médica confiable a pacientes, familiares y comunidad a través de entrevistas, contenidos digitales y espacios de orientación oncológica."
          },
          {
            kicker: "Aviso médico",
            title: "Información clara, no reemplazo de consulta",
            copy:
              "Los contenidos de esta web tienen finalidad educativa y orientativa. No sustituyen una evaluación médica personalizada, el diagnóstico presencial ni las decisiones terapéuticas tomadas dentro de una relación médico-paciente."
          }
        ]}
        ctaTitle="Explora el archivo médico y editorial"
        ctaCopy="Revisa casos clínicos, editoriales e investigación oncológica publicados desde una mirada clínica, educativa y centrada en el paciente."
        ctaLinks={[
          { label: "Ver casos clínicos", href: "/casos-clinicos", variant: "primary" },
          { label: "Leer editoriales", href: "/editoriales", variant: "secondary" }
        ]}
      />
    </>
  );
}
