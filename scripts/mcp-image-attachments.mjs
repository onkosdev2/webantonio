import assert from "node:assert/strict";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { attachmentRef, attachmentTransport } from "./fixtures/attachment-downloads.mjs";

const database = new URL(process.env.DATABASE_URL || "");
assert(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname.endsWith("_test"), "Solo base local aislada terminada en _test.");
assert(process.env.ONKOS_LOCAL_MEDIA === "true", "No se permite R2 en estas pruebas.");
const { createChatGptMcpServer } = await import("../lib/mcp/chatgpt-server.ts");
const { createAttachmentDownloader } = await import("../lib/storage/publication-attachments.ts");
const fixture = attachmentTransport();
const db = new PrismaClient();
const server = createChatGptMcpServer({ publicationImages: { downloadAttachment: createAttachmentDownloader(fixture.dependencies), revalidate: () => {} } });
const client = new Client({ name: "onkos-local-attachment-tests", version: "1.0.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const contentIds = [];
const stamp = Date.now();
let checks = 0;
function check(condition, message) { assert(condition, message); console.log(`OK ${++checks}: ${message}`); }
const metadata = (title = "Imagen técnica adjunta") => ({ title, altText: "Imagen sintética para prueba técnica local, sin datos personales.", caption: "Prueba de adjuntos, no material clínico." });
async function image(name, format, color) {
  const bytes = await sharp({ create: { width: 40, height: 30, channels: 3, background: color } })[format]().toBuffer();
  const mime = `image/${format}`;
  fixture.fixtures.set(`/${name}`, { bytes, mime });
  return { file: attachmentRef(name, mime), bytes };
}
async function call(args) {
  const result = await client.callTool({ name: "manage_publication_images", arguments: args });
  assert(!result.isError, result.content?.[0]?.text);
  return result.structuredContent;
}
async function rejects(args, label, code) {
  const before = await db.mediaAsset.count({ where: { contentId: { in: contentIds } } });
  const result = await client.callTool({ name: "manage_publication_images", arguments: args });
  check(result.isError && (!code || result.structuredContent?.error?.code === code), label);
  assert.equal(await db.mediaAsset.count({ where: { contentId: { in: contentIds } } }), before, "Un rechazo no debe crear registros de medios.");
}
try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const png = await image("attachment.png", "png", "#163f37");
  const jpeg = await image("attachment.jpg", "jpeg", "#7c4136");
  const webp = await image("attachment.webp", "webp", "#365b7c");
  const tools = (await client.listTools()).tools;
  const tool = tools.find((entry) => entry.name === "manage_publication_images");
  check(JSON.stringify(tool._meta?.["openai/fileParams"]) === JSON.stringify(["files"]), "MCP anuncia files como adjuntos nativos de ChatGPT");
  const fileSchema = tool.inputSchema.properties.files.items;
  check(["download_url", "file_id", "mime_type", "file_name"].every((key) => fileSchema.properties[key]) && JSON.stringify([...fileSchema.required].sort()) === JSON.stringify(["download_url", "file_id"]) && tool.inputSchema.properties.images.items.properties.imageBase64, "contrato oficial y Base64 antiguo coexisten");

  const item = await db.content.create({ data: { type: "CLINICAL_CASE", slug: `attachment-case-${stamp}`, title: "Caso ficticio de pruebas de adjuntos", summary: "Prueba local de imágenes, sin paciente real ni datos clínicos.", body: "Contenido técnico sintético para verificar transporte, validación y almacenamiento de adjuntos." } });
  contentIds.push(item.id);
  const original = await db.mediaAsset.create({ data: { contentId: item.id, mediaType: "image", title: "Portada previa preservada", storagePath: "/editorial-ct-scan.png", isFeatured: true } });
  const base = { entity: "clinical_case", slug: item.slug, action: "add_gallery", anonymizedConfirmed: true };
  let result = await call({ ...base, files: [png.file], images: [metadata("Adjunto PNG técnico")] });
  check(result.success && result.added.length === 1 && result.galleryCount === 1 && result.added[0].position === 1 && result.added[0].mediaId && result.added[0].url && result.added[0].title === "Adjunto PNG técnico", "add_gallery PNG adjunto y respuesta completa de resultado");
  result = await call({ ...base, images: [{ ...metadata(), file: jpeg.file }] });
  check(result.galleryCount === 2 && result.added.length === 1, "add_gallery JPEG adjunto mediante images[].file");
  const { mime_type, file_name, ...minimalReference } = webp.file;
  result = await call({ ...base, files: [minimalReference], images: [metadata()] });
  check(result.galleryCount === 3, "add_gallery WEBP con referencia sin MIME ni nombre opcionales");
  check(result.featured_media_id === original.id, "los adjuntos de galería no reemplazan la portada");

  fixture.fixtures.set("/invalid.png", { bytes: Buffer.from("not an image"), mime: "image/png" });
  await rejects({ ...base, files: [attachmentRef("invalid.png", "image/png")], images: [metadata()] }, "add_gallery rechaza archivo inválido", "UNSUPPORTED_IMAGE_FORMAT");
  await rejects({ ...base, images: [metadata()] }, "add_gallery sin archivo indica qué falta", "INVALID_IMAGE_ARGUMENTS");
  const fourth = await image("legacy.png", "png", "#604090");
  result = await call({ ...base, images: [{ ...metadata(), imageBase64: fourth.bytes.toString("base64") }] });
  check(result.galleryCount === 4 && result.added.length === 1, "add_gallery imageBase64 mantiene compatibilidad");
  result = await call({ ...base, files: [png.file], images: [{ ...metadata(), imageBase64: png.bytes.toString("base64") }] });
  check(result.galleryCount === 4 && result.added.length === 0 && result.updated.length === 1, "referencia y Base64 idénticos no duplican archivos");
  await rejects({ ...base, files: [png.file], images: [{ ...metadata(), imageBase64: fourth.bytes.toString("base64") }] }, "rechaza fuentes en conflicto", "CONFLICTING_IMAGE_SOURCES");
  await rejects({ ...base, files: [png.file], images: [{ ...metadata(), file: png.file }] }, "rechaza ambigüedad entre files e images[].file", "INVALID_IMAGE_ARGUMENTS");
  await rejects({ ...base, files: [png.file, jpeg.file], images: [metadata()] }, "exige correspondencia exacta entre archivos y metadatos", "INVALID_IMAGE_ARGUMENTS");
  await rejects({ ...base, images: [{ ...metadata(), mediaId: original.id }] }, "add_gallery no reutiliza mediaId");

  await db.content.update({ where: { id: item.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  const downloadCount = fixture.calls.length;
  await rejects({ ...base, files: [png.file], images: [metadata()] }, "caso publicado exige ACTUALIZAR_PUBLICADO antes de descargar");
  check(fixture.calls.length === downloadCount, "no descarga ni procesa archivos si falta autorización de publicación");
  const published = { ...base, confirmation: "ACTUALIZAR_PUBLICADO" };
  result = await call({ ...published, files: [png.file], images: [metadata()] });
  check(result.success && result.status === "PUBLISHED", "caso publicado con confirmación permite adjunto sin cambiar estado");
  await rejects({ ...published, anonymizedConfirmed: false, files: [png.file], images: [metadata()] }, "anonymizedConfirmed=false rechazado");
  const { anonymizedConfirmed, ...notConfirmed } = published;
  await rejects({ ...notConfirmed, files: [png.file], images: [metadata()] }, "anonimización omitida también rechazada", "INVALID_IMAGE_ARGUMENTS");
  await rejects({ ...published, files: Array(21).fill(png.file), images: Array.from({ length: 21 }, () => metadata()) }, "no admite más de 20 imágenes por operación");
  await rejects({ ...published, files: [png.file], images: [metadata()], expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }, "versionado evita sobrescribir cambios concurrentes");
  await rejects({ ...published, slug: `missing-${stamp}`, files: [png.file], images: [metadata()] }, "caso inexistente devuelve error accionable", "PUBLICATION_NOT_FOUND");
  await rejects({ ...published, files: [{ ...png.file, download_url: "https://evil.example/image.png" }], images: [metadata()] }, "MCP rechaza sustituto URL externo", "ATTACHMENT_HOST_NOT_ALLOWED");
  await rejects({ ...published, files: [{ ...png.file, mime_type: "image/jpeg" }], images: [metadata()] }, "MCP rechaza MIME falso", "INVALID_IMAGE_MIME");
  await rejects({ ...published, files: [{ ...png.file, file_name: "../../private.png" }], images: [metadata()] }, "MCP bloquea nombres con traversal", "INVALID_FILE_NAME");

  const galleryIds = result.gallery.map((asset) => asset.id);
  result = await call({ ...published, action: "reorder_gallery", mediaIds: galleryIds.toReversed() });
  check(result.gallery[0].id === galleryIds.at(-1), "reorder_gallery usa IDs de cargas dedicadas");
  const removedId = result.gallery[0].id;
  result = await call({ ...published, action: "remove_gallery", mediaIds: [removedId] });
  check(result.removed[0].mediaId === removedId && await db.mediaAsset.findUnique({ where: { id: removedId } }), "remove_gallery conserva el archivo y devuelve el medio retirado");
  const beforeCover = result.gallery.map((asset) => asset.id);
  result = await call({ ...published, action: "set_featured", files: [fourth.file], images: [metadata("Portada adjunta separada")] });
  check(result.featured_media_id !== original.id && JSON.stringify(result.gallery.map((asset) => asset.id)) === JSON.stringify(beforeCover), "set_featured adjunto no altera galería");
  check(result.featuredImage.position === null && result.added[0].mediaId === result.featured_media_id, "respuesta de portada distingue posición fuera de galería");
  check((await db.mediaAsset.findUnique({ where: { id: original.id } })).storagePath === original.storagePath, "la imagen existente conserva su archivo y ruta");

  const many = [];
  for (let index = 0; index < 31; index++) many.push(await image(`capacity-${index}.png`, "png", { r: index * 7, g: 90, b: 150 }));
  result = await call({ ...published, action: "replace_gallery", files: many.slice(0, 20).map((entry) => entry.file), images: many.slice(0, 20).map(() => metadata()) });
  check(result.galleryCount === 20, "replace_gallery acepta 20 adjuntos sin borrar archivos previos");
  result = await call({ ...published, files: many.slice(20, 30).map((entry) => entry.file), images: many.slice(20, 30).map(() => metadata()) });
  check(result.galleryCount === 30, "admite exactamente 30 imágenes en galería");
  await rejects({ ...published, files: [many[30].file], images: [metadata()] }, "rechaza superar 30 imágenes", "GALLERY_FULL");
  const largePng = Buffer.concat([png.bytes, Buffer.alloc(7 * 1024 * 1024)]);
  fixture.fixtures.set("/batch.png", { bytes: largePng, mime: "image/png" });
  await rejects({ ...published, action: "replace_gallery", files: Array(3).fill(attachmentRef("batch.png", "image/png")), images: Array.from({ length: 3 }, () => metadata()) }, "aplica máximo de 20 MB por lote sin guardar parcialmente", "FILE_TOO_LARGE");
  const afterFailure = await db.mediaAsset.count({ where: { contentId: item.id, isGalleryUpload: true, galleryOrder: { not: null } } });
  check(afterFailure === 30, "lote rechazado conserva íntegra la galería anterior");

  const news = await db.content.create({ data: { type: "NEWS_ITEM", slug: `attachment-news-${stamp}`, title: "Noticia ficticia para probar adjuntos", summary: "Prueba técnica sin datos reales.", body: "Prueba de galería de noticias." } });
  contentIds.push(news.id);
  result = await call({ entity: "news_item", slug: news.slug, action: "add_gallery", files: [png.file, jpeg.file, webp.file], images: [metadata(), metadata(), metadata()] });
  check(result.galleryCount === 3 && result.added.length === 3, "noticias aceptan los tres formatos de adjunto sin cambiar otras herramientas");
  console.log(`\n${checks} comprobaciones MCP de adjuntos superadas; cliente real MCP, HTTPS simulado, PostgreSQL local, sin IA ni R2.`);
} finally {
  await client.close().catch(() => {});
  await server.close().catch(() => {});
  if (contentIds.length) await db.$transaction([
    db.mediaAsset.deleteMany({ where: { contentId: { in: contentIds } } }),
    db.importLog.deleteMany({ where: { contentId: { in: contentIds } } }),
    db.content.deleteMany({ where: { id: { in: contentIds } } })
  ]);
  await db.$disconnect();
  const { db: serviceDb } = await import("../lib/db.ts");
  await serviceDb.$disconnect();
}
