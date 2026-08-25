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

const sampleNotice =
  "> Material docente y editorial de muestra. No describe a un paciente real ni sustituye fuentes primarias, guías vigentes o una decisión clínica individualizada.";

const publishedHomeEntries = [
  {
    type: ContentType.CLINICAL_CASE,
    title: "Cáncer de pulmón no microcítico estadio IV: decisión terapéutica individualizada",
    slug: "cancer-pulmon-no-microcitico-estadio-iv-decision-terapeutica",
    summary:
      "Caso docente compuesto para integrar extensión de enfermedad, perfil molecular, estado funcional y preferencias antes de definir una estrategia.",
    body: `${sampleNotice}

## Punto de partida

Una persona adulta consulta por tos persistente, pérdida de peso y disnea. Las imágenes muestran una lesión pulmonar con enfermedad a distancia y la biopsia confirma un carcinoma de pulmón no microcítico. El primer reto no es elegir un fármaco, sino ordenar la información que cambia la decisión.

![Imagen microscópica editorial de células tumorales](/editorial-cancer-cells.png)

## Preguntas que organizan el caso

Se revisan histología, perfil molecular, biomarcadores, carga sintomática, estado funcional y comorbilidades. También se conversa sobre objetivos, logística y tolerancia esperada. Ningún dato aislado reemplaza esta lectura conjunta.

## Decisión razonada

La discusión multidisciplinaria contrasta alternativas sistémicas y medidas de soporte. El plan se entiende como una secuencia revisable: tratar, medir respuesta, vigilar toxicidad y volver a decidir.

## Aprendizajes para la práctica

Documentar la evidencia utilizada, las incertidumbres y las preferencias expresadas da continuidad al cuidado y evita convertir una recomendación en una orden descontextualizada.`,
    source: "Caso docente compuesto",
    tags: ["pulmón", "decisión compartida", "biomarcadores", "docencia"],
    publishedAt: new Date("2026-06-18T14:00:00.000Z"),
    oncologyData: {
      tumorType: "Cáncer de pulmón",
      stage: "IV",
      biomarkers: ["Perfil molecular pendiente"],
      treatmentLine: "Primera línea",
      treatmentPlan: "Discusión multidisciplinaria y estrategia sistémica individualizada.",
      response: "No aplica: caso docente",
      toxicities: [],
      evidenceLevel: "Material de muestra",
      reviewNotes: "Sustituir por un caso real anonimizado y revisado.",
      anonymized: true
    }
  },
  {
    type: ContentType.CLINICAL_CASE,
    title: "Cáncer de mama HER2+: valorando escalamiento terapéutico",
    slug: "cancer-mama-her2-escalamiento-terapeutico",
    summary:
      "Lectura docente sobre los datos que deben revisarse antes de intensificar o desescalar una estrategia en enfermedad HER2 positiva.",
    body: `${sampleNotice}

## Contexto clínico

El escenario reúne una neoplasia de mama HER2 positiva, evaluación de extensión completa y una persona clínicamente apta para tratamiento. La conversación empieza por el objetivo terapéutico y por la secuencia prevista.

## Qué cambia la conducta

Tamaño tumoral, compromiso ganglionar, confirmación del biomarcador, función cardiaca y respuesta aportan capas distintas. Escalar o desescalar exige leerlas juntas y reconocer qué parte de la recomendación proviene de evidencia sólida y cuál depende del contexto.

## Seguimiento útil

Toxicidades, respuesta clínica, imágenes y hallazgos patológicos alimentan la siguiente decisión. Explicar esta lógica ayuda a comprender por qué el tratamiento puede ajustarse sin que ello signifique improvisación.`,
    source: "Caso docente compuesto",
    tags: ["mama", "HER2", "neoadyuvancia", "decisión compartida"],
    publishedAt: new Date("2026-06-12T14:00:00.000Z"),
    oncologyData: {
      tumorType: "Cáncer de mama",
      stage: "Localmente avanzado",
      biomarkers: ["HER2"],
      treatmentLine: "Neoadyuvancia",
      treatmentPlan: "Secuencia sistémica y reevaluación multidisciplinaria.",
      response: "Pendiente de reevaluación",
      toxicities: [],
      evidenceLevel: "Material de muestra",
      reviewNotes: "Reemplazar por información clínica validada.",
      anonymized: true
    }
  },
  {
    type: ContentType.CLINICAL_CASE,
    title: "Linfoma difuso de células grandes B: del diagnóstico a la consolidación",
    slug: "linfoma-difuso-celulas-grandes-b-diagnostico-consolidacion",
    summary:
      "Caso docente que recorre confirmación diagnóstica, estratificación, respuesta y puntos de decisión posteriores.",
    body: `${sampleNotice}

## Confirmar antes de clasificar

Una adenopatía de crecimiento rápido conduce a biopsia y revisión hematopatológica. Arquitectura, inmunohistoquímica y estudios complementarios son esenciales para confirmar el subtipo.

![Micrografía histológica editorial](/editorial-histology.png)

## Construir una línea de base

Extensión, estado funcional, síntomas, laboratorio y riesgos individuales conforman la fotografía inicial. Esta línea de base permite interpretar después la respuesta y distinguir evolución de toxicidad.

## Reevaluar con propósito

Cada control debe responder una pregunta concreta. Consolidación o seguimiento no se deciden por inercia: dependen de respuesta, riesgo, tolerancia y alternativas disponibles.`,
    source: "Caso docente compuesto",
    tags: ["linfoma", "hematopatología", "respuesta", "docencia"],
    publishedAt: new Date("2026-06-05T14:00:00.000Z"),
    oncologyData: {
      tumorType: "Linfoma difuso de células grandes B",
      stage: "Por definir",
      biomarkers: [],
      treatmentLine: "Primera línea",
      treatmentPlan: "Confirmación diagnóstica, estadificación y tratamiento protocolizado.",
      response: "No aplica: caso docente",
      toxicities: [],
      evidenceLevel: "Material de muestra",
      reviewNotes: "Reemplazar por un caso revisado por hematología.",
      anonymized: true
    }
  },
  {
    type: ContentType.REFLECTION,
    title: "El tiempo de la escucha en oncología",
    slug: "el-tiempo-de-la-escucha-en-oncologia",
    summary:
      "Una reflexión sobre la escucha como herramienta clínica para comprender prioridades, miedos y decisiones difíciles.",
    body: `${sampleNotice}

## Escuchar también produce información

En oncología, una pausa puede revelar tanto como una respuesta. La manera en que una persona describe cansancio, miedo o incertidumbre ayuda a entender qué está en juego más allá de un examen.

## Tiempo clínico y tiempo humano

Escuchar exige formular preguntas abiertas, no interrumpir la primera respuesta y comprobar que lo entendido coincide con lo que la persona quiso decir.

## Una decisión que puede habitarse

La mejor explicación es la que permite participar. Cuando riesgos, beneficios e incertidumbres se expresan con claridad, la decisión deja de sentirse ajena. La escucha no adorna la medicina: orienta el cuidado.`,
    source: "Reflexión editorial de muestra",
    tags: ["escucha", "comunicación", "decisión compartida", "humanidad"],
    publishedAt: new Date("2026-05-29T14:00:00.000Z")
  },
  {
    type: ContentType.NEWS_ITEM,
    title: "Nuevas recomendaciones ESMO 2024 en cáncer colorrectal",
    slug: "recomendaciones-esmo-2024-cancer-colorrectal",
    summary:
      "Prototipo de lectura crítica para presentar una actualización de guía sin perder población, alcance y límites.",
    body: `${sampleNotice}

## Antes del titular

Una actualización debe leerse desde su alcance: población, escenario clínico, fecha de búsqueda y fuerza de cada recomendación. Esta entrada funciona como maqueta y no reproduce una recomendación específica.

## Qué debería encontrar el lector

La versión final debe enlazar la guía primaria, distinguir cambios de práctica de ajustes menores y explicar qué perfiles quedan fuera. También debe señalar dependencias de biomarcadores, tecnología o recursos locales.

## Aplicación prudente

Una guía orienta, pero no reemplaza la valoración individual. Antes de publicar, este prototipo debe actualizarse con la fuente oficial y someterse a revisión clínica.`,
    source: "Maqueta editorial — fuente pendiente",
    tags: ["colorrectal", "guías", "ESMO", "lectura crítica"],
    publishedAt: new Date("2024-05-12T14:00:00.000Z"),
    oncologyData: {
      tumorType: "Cáncer colorrectal",
      biomarkers: [],
      anonymized: true
    }
  },
  {
    type: ContentType.NEWS_ITEM,
    title: "Terapia dirigida en cáncer de pulmón: actualización de evidencia",
    slug: "terapia-dirigida-cancer-pulmon-actualizacion-evidencia",
    summary:
      "Modelo editorial para ordenar una novedad alrededor de biomarcadores, magnitud del beneficio y aplicabilidad.",
    body: `${sampleNotice}

## La novedad necesita contexto

Una señal de eficacia no basta para definir práctica. La lectura debe precisar diseño, población, comparador, desenlace principal, seguimiento y seguridad.

![Tomografía axial editorial de tórax](/editorial-ct-scan.png)

## El biomarcador como puerta de entrada

La calidad de la prueba molecular y el momento de realizarla son parte de la decisión. La versión definitiva debe identificar biomarcador, método de detección y población aplicable.

## Qué comunicar

Conviene separar resultado estadístico, relevancia clínica e incertidumbre: qué cambió, qué todavía no sabemos y qué debe verificarse antes de trasladar la evidencia.`,
    source: "Maqueta editorial — fuente pendiente",
    tags: ["pulmón", "terapia dirigida", "biomarcadores", "evidencia"],
    publishedAt: new Date("2024-05-05T14:00:00.000Z"),
    oncologyData: {
      tumorType: "Cáncer de pulmón",
      biomarkers: ["Por validar"],
      anonymized: true
    }
  },
  {
    type: ContentType.NEWS_ITEM,
    title: "Inmunoterapia perioperatoria en melanoma resecable",
    slug: "inmunoterapia-perioperatoria-melanoma-resecable",
    summary:
      "Estructura de muestra para contextualizar una estrategia perioperatoria, sus desenlaces y preguntas abiertas.",
    body: `${sampleNotice}

## Una estrategia, varios momentos

El término perioperatorio reúne decisiones antes y después de la cirugía. Para comprender una actualización hay que describir secuencia, población y objetivo de cada fase.

## Desenlaces que importan

Respuesta patológica, supervivencia libre de eventos, supervivencia global, toxicidad y posibilidad de completar la cirugía no son equivalentes. Una lectura útil explica qué desenlace sostiene el titular.

## Preguntas para la práctica

Selección, toxicidades y acceso condicionan la aplicabilidad. La entrada final deberá enlazar la publicación primaria, consignar cifras verificadas y diferenciar recomendación formal de hipótesis.`,
    source: "Maqueta editorial — fuente pendiente",
    tags: ["melanoma", "inmunoterapia", "perioperatorio", "lectura crítica"],
    publishedAt: new Date("2024-04-28T14:00:00.000Z"),
    oncologyData: {
      tumorType: "Melanoma",
      biomarkers: [],
      anonymized: true
    }
  },
  {
    type: ContentType.RESEARCH,
    title: "Cómo leer estudios y guías oncológicas sin perder el contexto",
    slug: "como-leer-estudios-y-guias-oncologicas",
    summary:
      "Una ruta breve para distinguir diseño, población, desenlaces, magnitud del efecto y aplicabilidad clínica.",
    body: `${sampleNotice}

## Empiece por la pregunta

Identifique población, intervención, comparador y desenlace. Si la pregunta del estudio no coincide con la pregunta clínica, la cifra principal puede ser correcta y aun así poco útil.

## Diferencie significación y relevancia

Un resultado estadísticamente significativo no describe por sí solo la magnitud del beneficio. Revise efecto absoluto, intervalos de confianza, seguimiento, calidad de vida y toxicidades.

## Busque a quienes no están representados

Edad, estado funcional, comorbilidades, acceso y diversidad molecular influyen en la aplicabilidad. Las exclusiones ayudan a reconocer cuándo se está extrapolando.

## Cierre con una decisión trazable

Declare qué evidencia apoya la decisión, qué incertidumbre permanece y qué preferencia puede inclinar la balanza.`,
    source: "Guía editorial de muestra",
    tags: ["metodología", "guías", "lectura crítica", "evidencia"],
    publishedAt: new Date("2026-05-22T14:00:00.000Z")
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

  for (const item of publishedHomeEntries) {
    const oncologyData = item.oncologyData
      ? {
          upsert: {
            create: item.oncologyData,
            update: item.oncologyData
          }
        }
      : undefined;

    await prisma.content.upsert({
      where: { slug: item.slug },
      update: {
        type: item.type,
        status: ContentStatus.PUBLISHED,
        title: item.title,
        summary: item.summary,
        body: item.body,
        source: item.source,
        author: "Dr. Antonio Camargo",
        tags: item.tags,
        publishedAt: item.publishedAt,
        oncologyData
      },
      create: {
        type: item.type,
        status: ContentStatus.PUBLISHED,
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        body: item.body,
        source: item.source,
        author: "Dr. Antonio Camargo",
        tags: item.tags,
        publishedAt: item.publishedAt,
        oncologyData: item.oncologyData
          ? { create: item.oncologyData }
          : undefined
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
