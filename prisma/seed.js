const {
  PrismaClient,
  ContentStatus,
  ContentType,
  ImportState,
  AiTaskKind,
  AiTaskState
} = require("@prisma/client");

const prisma = new PrismaClient();

const cases = [
  {
    title: "Carcinoma pulmonar con mutacion EGFR y respuesta inicial a terapia dirigida",
    slug: "carcinoma-pulmonar-egfr-terapia-dirigida",
    summary:
      "Caso clinico docente sobre adenocarcinoma pulmonar avanzado con perfil molecular positivo para EGFR y respuesta temprana al tratamiento.",
    body:
      "Paciente con disnea progresiva y tos persistente. Se confirmó adenocarcinoma pulmonar con mutacion EGFR. Se inicia terapia dirigida con buena respuesta radiologica inicial y toxicidad controlada. El caso permite discutir biomarcadores, secuenciacion y seguimiento clinico.",
    status: ContentStatus.PENDING_REVIEW,
    tags: ["pulmon", "egfr", "terapia dirigida", "docencia"],
    oncologyData: {
      tumorType: "Cancer de pulmon",
      stage: "IV",
      biomarkers: ["EGFR"],
      treatmentLine: "Primera linea",
      treatmentPlan: "Terapia dirigida anti-EGFR y seguimiento clinico-radiologico.",
      response: "Respuesta parcial",
      toxicities: ["rash leve"],
      evidenceLevel: "Alta",
      reviewNotes: "Revisar seleccion de imagenes y ampliar comentario docente.",
      anonymized: true
    }
  },
  {
    title: "Cancer de mama HER2 positivo con respuesta patologica completa",
    slug: "cancer-mama-her2-respuesta-patologica-completa",
    summary:
      "Caso de mama HER2 positivo tratado en contexto neoadyuvante, con foco en respuesta patologica completa y valor docente.",
    body:
      "Paciente con tumor de mama HER2 positivo. Se planifico tratamiento sistémico neoadyuvante seguido de cirugía. La respuesta patologica completa reabre la discusión sobre pronóstico, biomarcadores y comunicación de expectativas.",
    status: ContentStatus.DRAFT,
    tags: ["mama", "her2", "neoadyuvancia"],
    oncologyData: {
      tumorType: "Cancer de mama",
      stage: "II",
      biomarkers: ["HER2"],
      treatmentLine: "Neoadyuvancia",
      treatmentPlan: "Bloqueo HER2, cirugía y valoración posterior.",
      response: "Respuesta patologica completa",
      toxicities: ["astenia"],
      evidenceLevel: "Alta",
      reviewNotes: "Añadir comentario sobre impacto docente y seguimiento.",
      anonymized: true
    }
  }
];

const newsItems = [
  {
    title: "Actualización en inmunoterapia adyuvante para cáncer de pulmón",
    slug: "actualizacion-inmunoterapia-adyuvante-pulmon",
    summary:
      "Borrador de noticia oncológica sobre una actualización relevante en inmunoterapia adyuvante para cáncer de pulmón.",
    body:
      "La novedad sugiere un posible cambio en el escenario adyuvante, pero conviene revisar población incluida, magnitud del beneficio y aplicabilidad real antes de extraer conclusiones.",
    status: ContentStatus.PENDING_REVIEW,
    source: "ASCO",
    tags: ["noticia", "pulmon", "inmunoterapia"],
    oncologyData: {
      tumorType: "Cancer de pulmon",
      biomarkers: ["PD-L1"],
      anonymized: true
    }
  }
];

async function main() {
  for (const item of cases) {
    await prisma.content.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        summary: item.summary,
        body: item.body,
        status: item.status,
        tags: item.tags,
        type: ContentType.CLINICAL_CASE,
        source: "seed",
        author: "Dr. Antonio Camargo",
        oncologyData: {
          upsert: {
            create: item.oncologyData,
            update: item.oncologyData
          }
        }
      },
      create: {
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        body: item.body,
        status: item.status,
        tags: item.tags,
        type: ContentType.CLINICAL_CASE,
        source: "seed",
        author: "Dr. Antonio Camargo",
        oncologyData: {
          create: item.oncologyData
        }
      }
    });
  }

  for (const item of newsItems) {
    await prisma.content.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        summary: item.summary,
        body: item.body,
        status: item.status,
        source: item.source,
        tags: item.tags,
        type: ContentType.NEWS_ITEM,
        author: "Dr. Antonio Camargo",
        oncologyData: {
          upsert: {
            create: item.oncologyData,
            update: item.oncologyData
          }
        }
      },
      create: {
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        body: item.body,
        status: item.status,
        source: item.source,
        tags: item.tags,
        type: ContentType.NEWS_ITEM,
        author: "Dr. Antonio Camargo",
        oncologyData: {
          create: item.oncologyData
        }
      }
    });
  }

  const importedEditorial = await prisma.content.upsert({
    where: { slug: "editorial-acceso-innovacion-oncologica" },
    update: {
      type: ContentType.EDITORIAL,
      status: ContentStatus.DRAFT,
      title: "Acceso a innovación oncológica en práctica real",
      summary: "Borrador importado desde un redactor externo.",
      body: "Texto editorial base importado para revisión y enriquecimiento posterior.",
      source: "redactor-editorial-v1",
      author: "Integracion externa",
      tags: ["editorial", "importado", "acceso"]
    },
    create: {
      type: ContentType.EDITORIAL,
      status: ContentStatus.DRAFT,
      title: "Acceso a innovación oncológica en práctica real",
      slug: "editorial-acceso-innovacion-oncologica",
      summary: "Borrador importado desde un redactor externo.",
      body: "Texto editorial base importado para revisión y enriquecimiento posterior.",
      source: "redactor-editorial-v1",
      author: "Integracion externa",
      tags: ["editorial", "importado", "acceso"]
    }
  });

  await prisma.importLog.upsert({
    where: { id: "seed-import-1" },
    update: {},
    create: {
      id: "seed-import-1",
      source: "redactor-editorial-v1",
      payloadType: "editorial",
      payloadSummary: "3 editoriales, 1 reflexion",
      state: ImportState.VALIDATED,
      contentId: importedEditorial.id,
      notes: "Seed inicial de importacion externa."
    }
  });

  const aiDraft = await prisma.content.upsert({
    where: { slug: "noticia-oncologica-senal-pulmon-terapia-dirigida" },
    update: {
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.PENDING_REVIEW,
      title: "Noticia oncológica: señal en terapia dirigida para pulmón",
      summary: "Borrador generado desde la cola IA para revisión editorial.",
      body: "Borrador interno generado con foco en cáncer de pulmón y terapias dirigidas.",
      source: "ia_interna",
      author: "IA asistente",
      tags: ["ia", "pulmon", "news_draft"]
    },
    create: {
      type: ContentType.NEWS_ITEM,
      status: ContentStatus.PENDING_REVIEW,
      title: "Noticia oncológica: señal en terapia dirigida para pulmón",
      slug: "noticia-oncologica-senal-pulmon-terapia-dirigida",
      summary: "Borrador generado desde la cola IA para revisión editorial.",
      body: "Borrador interno generado con foco en cáncer de pulmón y terapias dirigidas.",
      source: "ia_interna",
      author: "IA asistente",
      tags: ["ia", "pulmon", "news_draft"]
    }
  });

  await prisma.aiTask.upsert({
    where: { id: "seed-ai-task-1" },
    update: {},
    create: {
      id: "seed-ai-task-1",
      kind: AiTaskKind.NEWS_DRAFT,
      state: AiTaskState.READY,
      title: "NEWS_DRAFT · terapia dirigida en pulmón",
      prompt: "pulmon: terapia dirigida en pulmón",
      resultTitle: "Noticia oncológica: señal en terapia dirigida para pulmón",
      resultNote: "Borrador creado y enviado a revisión editorial.",
      contentId: aiDraft.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
