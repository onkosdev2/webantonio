import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

if (process.env.MCP_E2E_CONFIRM !== "1") {
  throw new Error("Esta prueba genera una imagen real. Ejecuta con MCP_E2E_CONFIRM=1.");
}

const endpoint = new URL(process.env.MCP_E2E_URL || "http://localhost:3000/mcp");
const prisma = new PrismaClient();
const client = new Client({ name: "onkos-mcp-e2e", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(endpoint);
let slug = "";
let imageUrl = "";

function structured(result) {
  if (result.isError) {
    const message = result.content?.find((item) => item.type === "text")?.text || "MCP tool error";
    throw new Error(message);
  }
  return result.structuredContent;
}

function check(condition, message) {
  if (!condition) throw new Error(`Verificación fallida: ${message}`);
  console.log(`✓ ${message}`);
}

async function cleanup() {
  if (imageUrl && process.env.R2_PUBLIC_BASE_URL && imageUrl.startsWith(`${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/`)) {
    const key = decodeURIComponent(imageUrl.slice(process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "").length + 1));
    const s3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
    });
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
    console.log("✓ imagen de prueba eliminada de R2");
  }
  if (slug) {
    await prisma.content.deleteMany({ where: { slug } });
    console.log("✓ caso de prueba eliminado de la base de datos");
  }
}

try {
  await client.connect(transport);
  const listed = await client.listTools();
  check(listed.tools.length === 17, "el servidor anuncia las 17 herramientas esperadas");

  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const draft = structured(await client.callTool({
    name: "create_clinical_case_draft",
    arguments: {
      title: `Prueba MCP ${stamp}: adenocarcinoma pulmonar localizado`,
      summary: "Caso clínico ficticio y completamente anonimizado creado para validar el flujo MCP editorial de extremo a extremo.",
      body: "## Presentación clínica\n\nPersona adulta con tos persistente y hallazgo pulmonar localizado durante una evaluación programada. No se incluyen nombres, documentos, fechas de nacimiento ni datos de contacto.\n\n## Evaluación\n\nLa evaluación clínica ficticia incluyó tomografía de tórax y confirmación histológica simulada para fines de prueba técnica.\n\n## Conducta\n\nSe planteó manejo multidisciplinario y seguimiento estructurado. Este contenido no describe a un paciente real y será eliminado al terminar la prueba.",
      tumorType: "Adenocarcinoma pulmonar",
      stage: "Localizado",
      biomarkers: [],
      treatmentLine: "Inicial",
      treatmentPlan: "Evaluación multidisciplinaria",
      response: "No aplica",
      toxicities: [],
      evidenceLevel: "Caso ficticio de prueba",
      tags: ["prueba-mcp"],
      anonymizedConfirmed: true
    }
  }));
  slug = draft.slug;
  check(draft.status === "DRAFT", "el caso se crea como borrador y no se publica automáticamente");

  const plan = structured(await client.callTool({
    name: "configure_case_images",
    arguments: {
      slug,
      figures: [
        {
          title: "Tomografía torácica editorial",
          category: "Radiología",
          purpose: "Representar el hallazgo pulmonar localizado descrito en el caso ficticio.",
          educationalMessage: "Localización anatómica referencial del hallazgo pulmonar.",
          prompt: "Realistic educational chest CT style medical image showing a small localized peripheral pulmonary nodule, neutral grayscale radiology appearance, clean clinical presentation, no patient identifiers, no labels, no text, no dramatic effects, clearly presented as an AI-generated educational reference and not a real diagnostic study.",
          placement: "after_heading",
          placementAnchor: "Evaluación",
          isFeatured: true
        },
        {
          title: "Reunión multidisciplinaria",
          category: "Fotografía editorial",
          purpose: "Mostrar el proceso colaborativo de decisión clínica sin identificar pacientes.",
          educationalMessage: "La planificación terapéutica requiere evaluación multidisciplinaria.",
          prompt: "Realistic editorial photograph of a multidisciplinary oncology team reviewing anonymized medical information in a modern hospital meeting room, professional calm atmosphere, natural light, no visible patient data, no readable screens, no text, no logos.",
          placement: "after_heading",
          placementAnchor: "Conducta",
          isFeatured: false
        },
        {
          title: "Seguimiento clínico",
          category: "Fotografía editorial",
          purpose: "Acompañar el cierre educativo sobre seguimiento estructurado.",
          educationalMessage: "El seguimiento organizado forma parte del cuidado oncológico longitudinal.",
          prompt: "Realistic medical editorial photograph of a quiet oncology consultation room prepared for follow-up, warm natural light, organized clinical environment, no people, no text, no logos, professional and reassuring visual tone.",
          placement: "end_of_article",
          isFeatured: false
        }
      ]
    }
  }));
  check(plan.status === "READY" && plan.figure_count === 3, "el plan visual queda READY con tres figuras");

  const generated = structured(await client.callTool({
    name: "generate_case_image",
    arguments: { slug, figureNumber: 1, provider: "openai", aspectRatio: "16:9", insertInBody: true }
  }));
  imageUrl = generated.image_url;
  check(Boolean(imageUrl) && generated.is_featured === true, "OpenAI genera una imagen y queda como portada");
  check(generated.inserted_in_body === true && generated.placement_fallback === false, "la imagen se inserta después del encabezado configurado");

  const reviewed = structured(await client.callTool({ name: "get_clinical_case", arguments: { slug } }));
  check(reviewed.body.includes(imageUrl), "el cuerpo recuperado contiene la imagen generada");
  check(reviewed.media.length === 1 && reviewed.media[0].is_featured, "el activo está asociado al caso y marcado como principal");

  const featured = structured(await client.callTool({ name: "set_case_featured_image", arguments: { slug, mediaId: reviewed.media[0].id } }));
  check(featured.featured_media_id === reviewed.media[0].id, "la selección explícita de portada funciona");

  const published = structured(await client.callTool({ name: "publish_clinical_case", arguments: { slug, confirmation: "PUBLICAR" } }));
  check(published.status === "PUBLISHED", "la publicación explícita cambia el estado a PUBLISHED");
  const publicResponse = await fetch(published.public_url);
  check(publicResponse.ok && (await publicResponse.text()).includes("Prueba MCP"), "la entrada publicada responde en su URL pública");
} finally {
  await cleanup().catch((error) => console.error(`Limpieza incompleta: ${error.message}`));
  await client.close().catch(() => undefined);
  await prisma.$disconnect();
}
