import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { archivePublication, archivePublicationSchema, updatePublication, updateClinicalCaseSchema, updateNewsSchema } from "@/lib/content/services/publication-mutations";
import { managePublicationImages, managePublicationImagesSchema } from "@/lib/content/services/publication-images";
import {
  configureCaseImages,
  configureImagesSchema,
  createClinicalCaseDraft,
  createClinicalCaseSchema,
  generateCaseImage,
  getClinicalCase,
  publishClinicalCase,
  setCaseFeaturedImage
} from "@/lib/mcp/clinical-case";
import {
  attachExistingNewsImage,
  createNewsDraft,
  createNewsDraftSchema,
  findReusableNewsImages,
  generateNewsImage,
  generateNewsImageSchema,
  getNewsItem,
  listRecentNews,
  newsStatusSchema,
  publishNews,
  publishNewsAutomated,
  publishNewsAutomatedSchema,
  reusableNewsImageSchema,
  searchNews
} from "@/lib/mcp/news";

const ok = (value: unknown, message: string) => ({
  content: [{ type: "text" as const, text: message }],
  structuredContent: value as Record<string, unknown>
});

function guarded<T extends Record<string, unknown>>(handler: () => Promise<T>, success: (value: T) => string) {
  return handler().then((value) => ok(value, success(value))).catch((error: unknown) => ({
    isError: true,
    content: [{ type: "text" as const, text: error instanceof Error ? error.message : "No se pudo completar la operación." }]
  }));
}

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const clinicalCaseStatusSchema = z.enum([
  "ALL",
  "DRAFT",
  "PENDING_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED"
]);

type ClinicalCaseStatusFilter = z.infer<typeof clinicalCaseStatusSchema>;

const statusTerms: Array<{
  status: Exclude<ClinicalCaseStatusFilter, "ALL">;
  pattern: RegExp;
}> = [
  { status: "PUBLISHED", pattern: /\b(publicad[oa]s?|published)\b/giu },
  { status: "DRAFT", pattern: /\b(borradores?|drafts?)\b/giu },
  { status: "PENDING_REVIEW", pattern: /\b(pendientes? de revisi[oó]n|pending review)\b/giu },
  { status: "SCHEDULED", pattern: /\b(programad[oa]s?|scheduled)\b/giu },
  { status: "ARCHIVED", pattern: /\b(archivad[oa]s?|archived)\b/giu }
];

function resolveClinicalCaseSearch(query: string, requestedStatus: ClinicalCaseStatusFilter) {
  let searchText = query.trim();
  let status = requestedStatus;

  if (status === "ALL") {
    for (const term of statusTerms) {
      term.pattern.lastIndex = 0;
      if (term.pattern.test(searchText)) {
        status = term.status;
        term.pattern.lastIndex = 0;
        searchText = searchText.replace(term.pattern, " ");
        break;
      }
    }
  }

  searchText = searchText
    .replace(/\b(casos?|cl[ií]nicos?)\b/giu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { searchText, status };
}

export function createChatGptMcpServer() {
  const server = new McpServer({ name: "onkos-content-publisher", version: "2.2.0" }, {
    instructions: [
      "Para corregir contenido usa update_clinical_case o update_news_item con changes parciales; no recrees la publicación. Mantén el slug y el estado. Recupera updated_at para expectedUpdatedAt. Editar contenido publicado requiere una orden explícita y confirmation=ACTUALIZAR_PUBLICADO.",
      "Para retirar contenido usa archive_clinical_case o archive_news_item con confirmation=ARCHIVAR solo por orden explícita. El archivado conserva datos y medios; no existe borrado físico en MCP.",
      "Usa manage_publication_images para la galería final y la portada, con propósitos separados. add_gallery y replace_gallery solo admiten archivos imageBase64 PNG/JPEG/WEBP cargados expresamente por el usuario para la galería, con title y altText: nunca mediaId, portadas ni figuras generadas. No generes imágenes para rellenar la galería; si faltan archivos, pídelos. reorder_gallery/remove_gallery usan exclusivamente IDs de cargas de esa galería. set_featured selecciona featuredMediaId de la publicación (no de galería) o carga una sola imagen de portada en images, sin incorporarla al carrusel. Exige confirmación humana al cargar imágenes clínicas. No sustituyas ni quites imágenes salvo orden del usuario.",
      "Usa list_recent_clinical_cases cuando el usuario pida los últimos, recientes o más nuevos casos sin indicar un término de búsqueda.",
      "Usa search_clinical_cases únicamente cuando exista un texto, diagnóstico o tema que buscar.",
      "Distingue siempre la intención de creación: DRAFT_ONLY o DIRECT_PUBLISH.",
      "DRAFT_ONLY aplica cuando el usuario pide borrador, revisión posterior, guardar sin publicar o cuando la intención no es inequívoca. En ese modo llama solamente a create_clinical_case_draft y detente; no configures imágenes, no generes imágenes y no publiques salvo que el usuario también lo haya pedido.",
      "DIRECT_PUBLISH aplica únicamente cuando el usuario ordena expresamente publicar, publicar directamente o crear y publicar. Esa orden explícita autoriza a enviar confirmation=PUBLICAR al final del flujo.",
      "En DIRECT_PUBLISH ejecuta el flujo completo en orden: crea el borrador con create_clinical_case_draft, configura un plan de 3 a 5 figuras si todavía no existe, genera cada figura aprobada mediante una llamada separada a generate_case_image, recupera el caso con get_clinical_case para comprobar anonimización, imágenes y portada, y finalmente llama a publish_clinical_case con confirmation=PUBLICAR.",
      "Si cualquier etapa de DIRECT_PUBLISH falla o falta información esencial, detente antes de publicar, conserva el caso como DRAFT y explica exactamente qué quedó pendiente.",
      "Nunca afirmes que un caso está anonimizado: exige confirmación real del usuario y permite que el servidor valide el contenido.",
      "Nunca publiques por inferencia, sugerencia o ambigüedad. Ante la duda usa DRAFT_ONLY.",
      "Configura de 3 a 5 figuras, genera una por llamada y revisa el resultado.",
      "Para noticias de Actualidad exige siempre el nombre de la fuente y su URL HTTP o HTTPS. Nunca inventes, completes ni atribuyas una fuente que no hayas recibido o verificado.",
      "Crea toda noticia primero con create_news_draft. Después busca una imagen editorial pertinente con find_reusable_news_images: si existe una imagen no sensible y claramente relacionada, asóciala con attach_existing_news_image; si no existe, genera una con generate_news_image.",
      "Antes de publicar una noticia, revísala con get_news_item y comprueba que la fuente, el enlace y la imagen principal correspondan al contenido.",
      "Publica una noticia únicamente ante una orden explícita del usuario y enviando confirmation=PUBLICAR a publish_news. Si falta la fuente o la imagen, conserva el borrador y explica qué falta.",
      "Usa publish_news_automated exclusivamente dentro de una automatización recurrente que ya tenga autorización para publicar. Esa herramienta recibe contenido y fuente validados, crea o recupera el borrador por URL, genera y asocia la portada, y publica sin confirmation=PUBLICAR. Nunca la uses como atajo en una conversación interactiva."
    ].join(" ")
  });

  server.registerTool("list_recent_clinical_cases", {
    title: "Listar casos clínicos recientes",
    description: "Devuelve los casos clínicos más recientes ordenados desde el último actualizado. Úsala para solicitudes como 'los últimos cinco casos', 'casos recientes' o 'qué casos hay'. Cada resultado incluye título, estado, resumen y enlaces.",
    inputSchema: {
      limit: z.number().int().min(1).max(20).default(5).describe("Cantidad de casos solicitada."),
      status: z.enum(["ALL", "DRAFT", "PENDING_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"])
        .default("ALL")
        .describe("Filtra por estado; usa ALL si el usuario no especifica uno.")
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ limit, status }) => guarded(async () => {
    const items = await db.content.findMany({
      where: {
        type: "CLINICAL_CASE",
        ...(status === "ALL" ? {} : { status })
      },
      select: { slug: true, title: true, summary: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit
    });

    return {
      items: items.map((item) => ({
        ...item,
        link: item.status === "PUBLISHED"
          ? `${siteUrl()}/casos-clinicos/${item.slug}`
          : `${siteUrl()}/panel/casos/${item.slug}`,
        public_url: item.status === "PUBLISHED" ? `${siteUrl()}/casos-clinicos/${item.slug}` : null,
        edit_url: `${siteUrl()}/panel/casos/${item.slug}`
      }))
    };
  }, (value) => `Encontré ${value.items.length} casos clínicos recientes.`));

  server.registerTool("search_clinical_cases", {
    title: "Buscar casos clínicos",
    description: "Lista los casos clínicos más recientes o busca casos existentes por texto y estado. Si el usuario pide casos publicados, usa status=PUBLISHED y deja query vacío. Devuelve estado y enlaces público y de edición.",
    inputSchema: {
      query: z.string().default("").describe("Diagnóstico, tema o texto opcional. No uses palabras de estado como 'publicados' como texto de búsqueda."),
      status: clinicalCaseStatusSchema
        .default("ALL")
        .describe("Filtra por estado; usa PUBLISHED cuando el usuario pida casos publicados."),
      limit: z.number().int().min(1).max(20).default(10)
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ query, status, limit }) => guarded(async () => {
    const resolved = resolveClinicalCaseSearch(query, status);
    const items = await db.content.findMany({
      where: {
        type: "CLINICAL_CASE",
        ...(resolved.status === "ALL" ? {} : { status: resolved.status }),
        ...(resolved.searchText
          ? {
              OR: [
                { title: { contains: resolved.searchText } },
                { summary: { contains: resolved.searchText } },
                { slug: { contains: resolved.searchText } }
              ]
            }
          : {})
      },
      select: { slug: true, title: true, summary: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit
    });

    return {
      items: items.map((item) => ({
        ...item,
        public_url: item.status === "PUBLISHED" ? `${siteUrl()}/casos-clinicos/${item.slug}` : null,
        edit_url: `${siteUrl()}/panel/casos/${item.slug}`
      }))
    };
  }, (value) => `Encontré ${value.items.length} casos clínicos.`));

  server.registerTool("get_clinical_case", {
    title: "Revisar caso clínico",
    description: "Recupera el caso, su plan de figuras, imágenes, portada y enlaces de edición/publicación.",
    inputSchema: { slug: z.string().min(1) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ slug }) => guarded(() => getClinicalCase({ slug }), (value) => `Caso recuperado: ${value.title}.`));

  server.registerTool("create_clinical_case_draft", {
    title: "Crear borrador de caso clínico",
    description: "Crea el caso en estado DRAFT. Úsala como única acción cuando el usuario pida un borrador y como primer paso técnico cuando ordene una publicación directa. Requiere confirmación real de anonimización. Puede incluir de 3 a 5 figuras con prompt, ubicación y portada. Esta herramienta por sí sola nunca publica.",
    inputSchema: createClinicalCaseSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => guarded(() => createClinicalCaseDraft(input), (value) => `Borrador creado: ${value.slug}. Revisa el caso y sus figuras antes de publicar.`));

  server.registerTool("configure_case_images", {
    title: "Configurar imágenes del caso",
    description: "Crea o reemplaza el plan vigente con 3 a 5 figuras. Define prompt, ubicación en el artículo y cuál será la imagen principal.",
    inputSchema: configureImagesSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => configureCaseImages(input), (value) => `Plan visual listo con ${value.figure_count} figuras.`));

  server.registerTool("generate_case_image", {
    title: "Generar una imagen del caso",
    description: "Genera la figura indicada con OpenAI (predeterminado), NVIDIA o ComfyUI y la inserta en la ubicación definida. Invócala una vez por cada figura aprobada.",
    inputSchema: {
      slug: z.string().min(1),
      figureNumber: z.number().int().min(1).max(5),
      provider: z.enum(["openai", "nvidia", "comfyui"]).default("openai"),
      aspectRatio: z.enum(["16:9", "4:3"]).default("16:9"),
      insertInBody: z.boolean().default(true),
      altText: z.string().min(10).optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
  }, (input) => guarded(() => generateCaseImage(input), (value) => `Imagen generada${value.is_featured ? " y definida como principal" : ""}.`));

  server.registerTool("set_case_featured_image", {
    title: "Definir imagen principal",
    description: "Selecciona una imagen ya generada del caso como portada principal.",
    inputSchema: { slug: z.string().min(1), mediaId: z.string().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => setCaseFeaturedImage(input), () => "Imagen principal actualizada."));

  server.registerTool("publish_clinical_case", {
    title: "Publicar caso clínico",
    description: "Paso final del modo DIRECT_PUBLISH. Publica un caso revisado únicamente cuando el usuario haya ordenado expresamente publicar, publicar directamente o crear y publicar. Requiere confirmation=PUBLICAR, anonimización válida e imagen principal. Nunca debe usarse para una solicitud de borrador ni ante una intención ambigua.",
    inputSchema: { slug: z.string().min(1), confirmation: z.literal("PUBLICAR") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => publishClinicalCase(input), (value) => `Caso publicado: ${value.public_url}`));

  server.registerTool("list_recent_news", {
    title: "Listar noticias recientes",
    description: "Devuelve las noticias de Actualidad más recientes, con estado, fuente, imagen principal y enlaces.",
    inputSchema: {
      limit: z.number().int().min(1).max(20).default(10),
      status: newsStatusSchema.default("ALL")
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => listRecentNews(input), (value) => `Encontré ${value.items.length} noticias recientes.`));

  server.registerTool("search_news", {
    title: "Buscar noticias",
    description: "Busca noticias de Actualidad por tema, diagnóstico, fuente o texto y permite filtrar por estado.",
    inputSchema: {
      query: z.string().min(2),
      limit: z.number().int().min(1).max(20).default(10),
      status: newsStatusSchema.default("ALL")
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => searchNews(input), (value) => `Encontré ${value.items.length} noticias.`));

  server.registerTool("create_news_draft", {
    title: "Crear borrador de noticia",
    description: "Crea una noticia de Actualidad en estado DRAFT. El nombre y la URL verificable de la fuente son obligatorios. Esta herramienta nunca publica.",
    inputSchema: createNewsDraftSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => guarded(() => createNewsDraft(input), (value) => `Borrador de noticia creado: ${value.slug}. Falta revisar y asignar una imagen antes de publicar.`));

  server.registerTool("find_reusable_news_images", {
    title: "Buscar imágenes existentes para una noticia",
    description: "Busca imágenes no sensibles ya disponibles en ONKOS que podrían reutilizarse como portada de una noticia. La selección final debe ser claramente pertinente al tema.",
    inputSchema: reusableNewsImageSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => findReusableNewsImages(input), (value) => `Encontré ${value.items.length} imágenes reutilizables candidatas.`));

  server.registerTool("attach_existing_news_image", {
    title: "Asociar imagen existente a noticia",
    description: "Asocia como portada una imagen existente, no sensible y pertinente. Conserva el archivo original y crea una asociación independiente para la noticia.",
    inputSchema: {
      slug: z.string().min(1),
      mediaId: z.string().min(1),
      altText: z.string().min(10).optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => attachExistingNewsImage(input), () => "Imagen existente asociada como portada de la noticia."));

  server.registerTool("generate_news_image", {
    title: "Generar imagen para noticia",
    description: "Genera y asocia una portada editorial cuando no hay una imagen existente adecuada. No debe incluir texto, logotipos, datos personales ni pacientes identificables.",
    inputSchema: generateNewsImageSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
  }, (input) => guarded(() => generateNewsImage(input), () => "Imagen editorial generada y asignada como portada."));

  server.registerTool("get_news_item", {
    title: "Revisar noticia",
    description: "Recupera el borrador completo, la fuente, el enlace original, las imágenes y los enlaces de edición/publicación.",
    inputSchema: { slug: z.string().min(1) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => getNewsItem(input), (value) => `Noticia recuperada: ${value.title}.`));

  server.registerTool("publish_news", {
    title: "Publicar noticia",
    description: "Publica una noticia revisada únicamente tras una orden explícita. Requiere confirmation=PUBLICAR, nombre y URL de fuente válidos, e imagen principal no sensible.",
    inputSchema: { slug: z.string().min(1), confirmation: z.literal("PUBLICAR") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => publishNews(input), (value) => `Noticia publicada: ${value.public_url}`));

  server.registerTool("publish_news_automated", {
    title: "Publicar noticia automáticamente",
    description: "Flujo idempotente y preautorizado para automatizaciones recurrentes: recibe una noticia validada, crea o recupera su borrador por URL de fuente, genera y asocia la imagen editorial y la publica. No requiere confirmation=PUBLICAR. Ante un fallo posterior a la creación conserva el borrador y devuelve un resultado reintentable.",
    inputSchema: publishNewsAutomatedSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  }, (input) => guarded(
    () => publishNewsAutomated(input),
    (value) => value.completed
      ? `Noticia publicada automáticamente: ${value.item.public_url}`
      : `Flujo automático incompleto en ${value.stage}; el borrador se conservó para reintento.`
  ));

  server.registerTool("update_clinical_case", {
    title: "Actualizar caso clínico",
    description: "Actualiza campos parciales sin cambiar slug, estado ni imágenes. Requiere anonimización confirmada; los cambios clínicos marcan el plan visual como STALE. Para contenido publicado exige ACTUALIZAR_PUBLICADO.",
    inputSchema: updateClinicalCaseSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => updatePublication("clinical_case", input), () => "Caso clínico actualizado; revisa cualquier plan visual marcado como STALE."));
  server.registerTool("archive_clinical_case", {
    title: "Archivar caso clínico",
    description: "Retira el caso de la web pública y conserva contenido e imágenes. Requiere confirmation=ARCHIVAR. No borra archivos.",
    inputSchema: archivePublicationSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => archivePublication("clinical_case", input), () => "Caso archivado; puede recuperarse desde el panel."));
  server.registerTool("update_news_item", {
    title: "Actualizar noticia",
    description: "Actualiza texto, fuente y metadatos sin cambiar slug, estado ni portada. Valida fuente y duplicados. Para contenido publicado exige ACTUALIZAR_PUBLICADO.",
    inputSchema: updateNewsSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => updatePublication("news_item", input), () => "Noticia actualizada."));
  server.registerTool("archive_news_item", {
    title: "Archivar noticia",
    description: "Retira la noticia de la web y sitemaps, conservando contenido e imágenes. Requiere confirmation=ARCHIVAR.",
    inputSchema: archivePublicationSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => guarded(() => archivePublication("news_item", input), () => "Noticia archivada; puede recuperarse desde el panel."));
  server.registerTool("manage_publication_images", {
    title: "Gestionar portada y galería de publicación",
    description: "Galería exclusiva de cargas dedicadas: add_gallery/replace_gallery reciben images con imageBase64 PNG/JPEG/WEBP, title y altText; NO admiten mediaId, portadas ni figuras generadas. reorder_gallery/remove_gallery usan mediaIds de esa galería. set_featured cambia solo portada: featuredMediaId ajeno a galería o un archivo en images. Sin cargas de galería no hay carrusel. Conserva originales. Máximo 20 archivos/lote y 30 en galería. Publicados: ACTUALIZAR_PUBLICADO. Cargas clínicas: anonymizedConfirmed=true.",
    // The SDK discovers object schemas, not a ZodEffects wrapper. The service
    // still parses the full schema, including all action-specific refinements.
    inputSchema: managePublicationImagesSchema.innerType(),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
  }, (input) => guarded(() => managePublicationImages(input), (value) => `Imágenes actualizadas; la galería contiene ${value.gallery.length} imágenes.`));

  return server;
}
