import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.MCP_NEWS_TEST_URL || "http://localhost:3000/mcp");
const prisma = new PrismaClient();
const client = new Client({ name: "onkos-mcp-news-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(endpoint);
let contentId = "";
let slug = "";

const requiredTools = [
  "list_recent_news",
  "search_news",
  "create_news_draft",
  "find_reusable_news_images",
  "attach_existing_news_image",
  "generate_news_image",
  "get_news_item",
  "publish_news",
  "publish_news_automated"
];

function check(condition, message) {
  if (!condition) throw new Error(`Verificacion fallida: ${message}`);
  console.log(`OK: ${message}`);
}

function structured(result) {
  if (result.isError) {
    const message = result.content?.find((item) => item.type === "text")?.text || "MCP tool error";
    throw new Error(message);
  }
  return result.structuredContent;
}

async function cleanup() {
  if (!contentId) return;
  await prisma.$transaction([
    prisma.importLog.deleteMany({ where: { contentId } }),
    prisma.mediaAsset.deleteMany({ where: { contentId } }),
    prisma.content.deleteMany({ where: { id: contentId, slug } })
  ]);
  console.log("OK: borrador temporal y asociaciones eliminados");
}

try {
  await client.connect(transport);

  const listed = await client.listTools();
  const names = new Set(listed.tools.map((tool) => tool.name));
  check(requiredTools.every((name) => names.has(name)), "las nueve herramientas de noticias estan publicadas");

  const stamp = Date.now();
  const draft = structured(await client.callTool({
    name: "create_news_draft",
    arguments: {
      title: `Prueba temporal MCP de actualidad oncologica ${stamp}`,
      summary: "Borrador temporal para comprobar que el MCP exige y conserva correctamente el nombre y el enlace original de la fuente.",
      body: "## Contexto\n\nEste contenido ficticio se crea exclusivamente para validar el flujo tecnico de noticias de Actualidad. No describe resultados clinicos reales ni ofrece recomendaciones medicas.\n\n## Alcance\n\nLa prueba confirma la fuente, el estado de borrador y las reglas previas a la publicacion.",
      sourceName: "Fuente tecnica temporal",
      sourceUrl: `https://example.com/onkos-news-smoke-${stamp}`,
      tumorType: "Oncologia",
      biomarkers: [],
      tags: ["prueba-mcp"]
    }
  }));
  contentId = draft.id;
  slug = draft.slug;
  check(draft.status === "DRAFT", "la noticia nace como borrador");
  check(draft.source_name === "Fuente tecnica temporal" && draft.source_url.includes("example.com"), "la fuente y su URL quedan almacenadas");

  const reviewed = structured(await client.callTool({ name: "get_news_item", arguments: { slug } }));
  check(reviewed.slug === slug && reviewed.media.length === 0, "el borrador se puede revisar antes de asignar imagen");

  const publishWithoutImage = await client.callTool({
    name: "publish_news",
    arguments: { slug, confirmation: "PUBLICAR" }
  });
  check(publishWithoutImage.isError === true, "la publicacion se bloquea mientras falte la imagen principal");

  const candidates = structured(await client.callTool({
    name: "find_reusable_news_images",
    arguments: { query: "oncologia cancer tumor", limit: 3 }
  }));
  check(Array.isArray(candidates.items), "la busqueda de imagenes existentes responde correctamente");

  if (candidates.items.length > 0) {
    const attached = structured(await client.callTool({
      name: "attach_existing_news_image",
      arguments: {
        slug,
        mediaId: candidates.items[0].media_id,
        altText: "Imagen editorial temporal para prueba del flujo MCP de noticias"
      }
    }));
    check(attached.is_featured === true, "una imagen existente se puede asociar como portada");

    const automated = structured(await client.callTool({
      name: "publish_news_automated",
      arguments: {
        title: draft.title,
        summary: draft.summary,
        body: reviewed.body,
        sourceName: draft.source_name,
        sourceUrl: draft.source_url,
        tumorType: "Oncologia",
        biomarkers: [],
        tags: ["prueba-mcp"],
        validation: "VALIDATED",
        imagePrompt: "Imagen editorial medica sobria sobre avances generales en oncologia, sin texto, logotipos ni pacientes identificables.",
        imageAltText: "Imagen editorial temporal para prueba del flujo MCP de noticias",
        imageProvider: "openai",
        imageAspectRatio: "16:9",
        automationRunId: `smoke-${stamp}`
      }
    }));
    check(
      automated.completed === true && automated.item.status === "PUBLISHED",
      "el método automatizado publica sin confirmation=PUBLICAR cuando la noticia ya está validada"
    );
  } else {
    console.log("OK: no habia imagen reutilizable; la ruta de generacion queda disponible sin ejecutarse");
  }
} finally {
  await cleanup().catch((error) => console.error(`Limpieza incompleta: ${error.message}`));
  await client.close().catch(() => undefined);
  await prisma.$disconnect();
}
