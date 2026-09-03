import assert from "node:assert/strict";
import sharp from "sharp";
import { galleryUploads } from "./fixtures/gallery-uploads.mjs";
import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Deliberately refuses production, the real local database, and remote endpoints.
const database = new URL(process.env.DATABASE_URL || "");
const endpoint = new URL(process.env.MCP_CRUD_URL || "http://127.0.0.1:3001/mcp");
assert(["127.0.0.1", "localhost"].includes(database.hostname) && database.pathname.endsWith("_test"), "Usa una base local dedicada terminada en _test.");
assert(["127.0.0.1", "localhost"].includes(endpoint.hostname), "Solo se prueban endpoints locales.");
const db = new PrismaClient();
const client = new Client({ name: "onkos-local-crud-tests", version: "1.0.0" });
const ids = [];
const sourceIds = [];
const previews = [];
const stamp = Date.now();
let checks = 0;
let succeeded = false;
const pixelImage = (await sharp({ create: { width: 2, height: 2, channels: 3, background: "#184c46" } }).png().toBuffer()).toString("base64");
function check(condition, label) { assert(condition, label); checks++; console.log(`OK ${checks}: ${label}`); }
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${result.content?.find((item) => item.type === "text")?.text}`);
  return result.structuredContent;
}
async function rejects(name, args, label) { const result = await client.callTool({ name, arguments: args }); check(result.isError === true, label); }
const body = "## Contexto\n\nContenido ficticio para comprobar el funcionamiento editorial de ONKOS. No describe un paciente real ni aporta evidencia clínica.\n\n## Evaluación\n\nSe revisan únicamente los procesos de consulta, edición, publicación y galería. Todas las imágenes son ejemplos técnicos para la prueba local.";
const summary = "Publicación ficticia de prueba local para validar el CRUD y la galería editorial; no corresponde a un caso real ni a una noticia médica.";

try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const { tools } = await client.listTools();
  const expected = ["list_recent_clinical_cases", "search_clinical_cases", "get_clinical_case", "create_clinical_case_draft", "configure_case_images", "generate_case_image", "set_case_featured_image", "publish_clinical_case", "list_recent_news", "search_news", "create_news_draft", "find_reusable_news_images", "attach_existing_news_image", "generate_news_image", "get_news_item", "publish_news", "publish_news_automated", "update_clinical_case", "archive_clinical_case", "update_news_item", "archive_news_item", "manage_publication_images"];
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected.sort());
  check(tools.length === 22, "catálogo exacto de 22 herramientas, sin operaciones heredadas");
  for (const route of ["tools", "resource", "resources"]) {
    const response = await fetch(new URL(`/api/mcp/${route}`, endpoint), { redirect: "manual" });
    check(response.status === 404, `API heredada ${route} retirada`);
  }
  for (const [index, storagePath] of ["/editorial-ct-scan.png", "/editorial-histology.png", "/editorial-cancer-cells.png"].entries()) {
    const source = await db.mediaAsset.create({ data: { title: `Imagen de demostración ${index + 1}`, altText: `Imagen editorial de demostración local número ${index + 1}`, storagePath, mediaType: "image", origin: "upload" } });
    sourceIds.push(source.id);
  }
  const sensitive = await db.mediaAsset.create({ data: { title: "Prueba sensible", storagePath: "/editorial-ct-scan.png", mediaType: "image", isSensitive: true } });
  sourceIds.push(sensitive.id);
  const other = await db.content.create({ data: { type: "NEWS_ITEM", status: "DRAFT", title: "Fuente privada de prueba", slug: `mcp-private-${stamp}`, summary, body, media: { create: { title: "Imagen privada", storagePath: "/private-fixture.png", mediaType: "image" } } }, include: { media: true } });
  ids.push(other.id);

  for (const entity of ["clinical_case", "news_item"]) {
    const clinical = entity === "clinical_case";
    const create = clinical ? "create_clinical_case_draft" : "create_news_draft";
    const read = clinical ? "get_clinical_case" : "get_news_item";
    const update = clinical ? "update_clinical_case" : "update_news_item";
    const archive = clinical ? "archive_clinical_case" : "archive_news_item";
    const publish = clinical ? "publish_clinical_case" : "publish_news";
    const input = { title: `Demostración local ${clinical ? "caso clínico" : "noticia"} ${stamp}`, summary, body, tumorType: "Oncología", ...(clinical ? { anonymizedConfirmed: true } : { sourceName: "Fuente técnica de prueba", sourceUrl: `https://example.com/onkos-test-${stamp}` }) };
    const draft = await call(create, input);
    ids.push(draft.id);
    let slug = draft.slug;
    check(draft.status === "DRAFT", `${entity}: crear conserva borrador`);
    const initial = await call(read, { slug });
    check(initial.body === body && Boolean(initial.updated_at), `${entity}: lectura completa y versión disponible`);
    await rejects(clinical ? "get_news_item" : "get_clinical_case", { slug }, "rechaza entidad incorrecta");
    const updateArgs = { slug, ...(clinical ? { anonymizedConfirmed: true } : {}) };
    await rejects(update, { ...updateArgs, changes: {} }, "rechaza parche vacío");
    await rejects(update, { ...updateArgs, changes: { status: "PUBLISHED" } }, "actualizar no permite publicar");
    await rejects(update, { ...updateArgs, changes: { title: "Título alternativo de prueba" }, expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }, "detecta versión obsoleta");
    if (clinical) {
      await rejects(update, { ...updateArgs, changes: { body: `${body}\nContacto: paciente@example.com` } }, "bloquea identificadores personales");
      await call("configure_case_images", { slug, figures: [1, 2, 3].map((number) => ({ title: `Figura técnica ${number}`, category: "Editorial", purpose: "Prueba técnica del plan de figuras", educationalMessage: "No aporta información clínica real", prompt: "Ilustración educativa de prueba sin datos identificables ni texto incrustado.", isFeatured: number === 1 })) });
    } else {
      await rejects(update, { ...updateArgs, changes: { sourceUrl: "file:///etc/passwd" } }, "rechaza fuente no HTTP(S)");
      const duplicate = await db.content.create({ data: { type: "NEWS_ITEM", title: "Noticia duplicada técnica", slug: `duplicate-${stamp}`, summary, body, sourceUrl: "https://example.com/occupied" } }); ids.push(duplicate.id);
      await rejects(update, { ...updateArgs, changes: { sourceUrl: "https://example.com/occupied" } }, "rechaza URL de fuente duplicada");
    }
    const updated = await call(update, { ...updateArgs, expectedUpdatedAt: initial.updated_at, changes: { summary: `${summary} Resumen actualizado.`, ...(clinical ? { response: "Seguimiento técnico sin datos reales" } : {}) } });
    check(updated.changed && updated.slug === slug, `${entity}: actualiza conservando slug`);
    if (clinical) check(updated.visual_plan_stale && (await db.caseVisualPlan.findFirst({ where: { contentId: draft.id, isCurrent: true } })).status === "STALE", "actualización clínica invalida plan visual");
    check((await call(read, { slug })).body === body, "campos omitidos se conservan");
    check((await call(update, { ...updateArgs, changes: { summary: `${summary} Resumen actualizado.` } })).changed === false, "parche repetido no genera cambios");
    const version = (await call(read, { slug })).updated_at;
    const competingEdits = await Promise.all(["concurrente-uno", "concurrente-dos"].map((tag) => client.callTool({ name: update, arguments: { ...updateArgs, expectedUpdatedAt: version, changes: { tags: [tag] } } })));
    check(competingEdits.filter((result) => !result.isError).length === 1, "ediciones concurrentes con la misma versión no se sobreescriben");
    const imagesArgs = { entity, slug, ...(clinical ? { anonymizedConfirmed: true } : {}) };
    const coverAsset = await db.mediaAsset.create({ data: { contentId: draft.id, title: "Portada existente de prueba", altText: "Portada de la publicación, fuera de la galería", storagePath: "/editorial-ct-scan.png", mediaType: "image", isFeatured: true, galleryOrder: 90 } });
    const figure = clinical ? await db.caseFigure.findFirst({ where: { plan: { contentId: draft.id, isCurrent: true } } }) : null;
    const generated = await db.mediaAsset.create({ data: { contentId: draft.id, title: "Figura generada de prueba", storagePath: "/editorial-histology.png", mediaType: "image", origin: "openai", figureId: figure?.id, galleryOrder: 91 } });
    const ordinary = await db.mediaAsset.create({ data: { contentId: draft.id, title: "Imagen existente sin propósito de galería", storagePath: "/editorial-cancer-cells.png", mediaType: "image", galleryOrder: 92 } });
    let cover = coverAsset.id;
    let gallery = await call("manage_publication_images", { ...imagesArgs, action: "set_featured", featuredMediaId: cover });
    check(gallery.gallery.length === 0, "portada, figura generada e imagen existente NO constituyen galería");
    // Legacy galleryOrder values do not opt existing media into the new gallery.
    await db.content.update({ where: { id: draft.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    const initialHtml = await (await fetch(new URL(`/${clinical ? "casos-clinicos" : "noticias"}/${slug}`, endpoint))).text();
    check(!initialHtml.includes('aria-roledescription="carrusel"'), "sin cargas específicas no aparece carrusel aunque existan imágenes");
    await db.content.update({ where: { id: draft.id }, data: { status: "DRAFT", publishedAt: null } });
    for (const [asset, label] of [[coverAsset, "portada"], [generated, "figura generada"], [ordinary, "imagen existente"], [{ id: sourceIds[0] }, "imagen de biblioteca"], [sensitive, "imagen sensible"], [other.media[0], "imagen privada ajena"]]) {
      await rejects("manage_publication_images", { ...imagesArgs, action: "add_gallery", images: [{ mediaId: asset.id }] }, `galería rechaza reutilizar ${label} por ID`);
    }
    await rejects("manage_publication_images", { ...imagesArgs, action: "replace_gallery", images: [{ ...galleryUploads[0], mediaId: generated.id }] }, "no permite mezclar archivo e ID para reutilizar una figura");
    await rejects("manage_publication_images", { ...imagesArgs, action: "add_gallery", images: [{ imageBase64: "not-an-image", title: "Prueba inválida", altText: "Archivo de prueba inválido" }] }, "rechaza bytes no válidos");
    const images = galleryUploads.slice(0, 2);
    if (clinical) await rejects("manage_publication_images", { entity, slug, action: "add_gallery", images }, "imágenes clínicas exigen confirmación humana");
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "add_gallery", images });
    check(gallery.gallery.length === 2 && gallery.featured_media_id === cover, "cargas dedicadas agregan galería sin cambiar portada");
    const firstGalleryId = gallery.gallery[0].id;
    const uploads = await db.mediaAsset.findMany({ where: { contentId: draft.id, isGalleryUpload: true } });
    check(uploads.length === 2 && uploads.every((asset) => asset.galleryUploadHash && asset.origin === "upload" && !asset.isFeatured && asset.figureId === null), "cargas registradas con propósito exclusivo y sin figura ni portada");
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "add_gallery", images });
    check(gallery.gallery.length === 2 && gallery.gallery[0].id === firstGalleryId, "repetir la misma carga no duplica la galería");
    const { caption: omittedCaption, ...imageWithoutCaption } = images[0];
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "add_gallery", images: [imageWithoutCaption] });
    check(gallery.gallery[0].caption === omittedCaption, "repetir carga sin pie conserva el pie previo");
    await rejects("manage_publication_images", { ...imagesArgs, action: "replace_gallery", images: [images[0], images[0]] }, "rechaza archivos duplicados en un lote");
    await rejects("manage_publication_images", { ...imagesArgs, action: "replace_gallery", images: [galleryUploads[2], { ...galleryUploads[3], imageBase64: "invalid-image" }] }, "lote con un archivo inválido no se guarda parcialmente");
    const afterRejectedBatch = await call(read, { slug });
    check(afterRejectedBatch.media.filter((image) => image.gallery_order !== null).length === 2, "lotes inválidos conservan la galería previa");
    check(afterRejectedBatch.media.filter((image) => [cover, generated.id, ordinary.id].includes(image.id)).every((image) => !image.is_gallery_upload && image.gallery_order === null), "lectura no clasifica medios anteriores como galería");
    await rejects("manage_publication_images", { ...imagesArgs, action: "set_featured", featuredMediaId: firstGalleryId }, "una carga de galería no puede convertirse en portada");
    await rejects(clinical ? "set_case_featured_image" : "attach_existing_news_image", { slug, mediaId: firstGalleryId }, "la herramienta previa de portada también respeta la separación");
    if (!clinical) {
      const reusable = await call("find_reusable_news_images", { query: "Archivo dedicado", limit: 20 });
      check(!reusable.items.some((image) => uploads.some((asset) => asset.id === image.media_id)), "buscador de portadas no ofrece cargas exclusivas de galería");
    }
    const galleryBeforeCover = gallery.gallery.map((image) => image.id);
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "set_featured", images: [{ ...galleryUploads[3], title: "Portada cargada directamente" }] });
    cover = gallery.featured_media_id;
    check(cover !== coverAsset.id && JSON.stringify(gallery.gallery.map((image) => image.id)) === JSON.stringify(galleryBeforeCover), "subir una portada directamente no la agrega ni altera la galería");
    check((await db.mediaAsset.findUnique({ where: { id: cover } })).isGalleryUpload === false, "portada cargada conserva propósito separado");
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "reorder_gallery", mediaIds: galleryBeforeCover.toReversed() });
    check(gallery.gallery[1].id === firstGalleryId, "ordena exclusivamente las cargas de galería");
    await rejects("manage_publication_images", { ...imagesArgs, action: "reorder_gallery", mediaIds: [cover] }, "orden rechaza IDs de portada");
    await rejects("manage_publication_images", { ...imagesArgs, action: "remove_gallery", mediaIds: [generated.id] }, "quitar de galería no puede afectar figuras");
    await rejects("manage_publication_images", { ...imagesArgs, action: "reorder_gallery", mediaIds: [firstGalleryId] }, "orden incompleto rechazado");
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "replace_gallery", images: galleryUploads.slice(1, 3) });
    check(gallery.gallery.length === 2 && gallery.featured_media_id === cover, "reemplazar con cargas conserva portada y figuras");
    check((await db.mediaAsset.findUnique({ where: { id: generated.id } })).galleryOrder === 91 && (await db.mediaAsset.findUnique({ where: { id: ordinary.id } })).galleryOrder === 92, "reemplazar no modifica siquiera las asociaciones heredadas ajenas");
    const removedId = gallery.gallery[0].id;
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "remove_gallery", mediaIds: [removedId] });
    check(gallery.gallery.length === 1 && Boolean(await db.mediaAsset.findUnique({ where: { id: removedId } })), "quitar de galería conserva el archivo");
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "add_gallery", images: [{ imageBase64: pixelImage, title: "Archivo nuevo de prueba", altText: "Píxel de prueba técnica de subida" }] });
    check(gallery.gallery.every((image) => image.image_url.startsWith("/uploads/publications/")), "galería usa únicamente archivos cargados localmente");
    gallery = await call("manage_publication_images", { ...imagesArgs, action: "replace_gallery", images: galleryUploads.slice(0, 3) });
    const published = await call(publish, { slug, confirmation: "PUBLICAR" });
    slug = published.slug;
    const publishedArgs = { ...updateArgs, slug };
    check(published.status === "PUBLISHED", `${entity}: publicación explícita`);
    await rejects(update, { ...publishedArgs, changes: { tags: ["test"] } }, "editar publicado exige confirmación");
    await call(update, { ...publishedArgs, confirmation: "ACTUALIZAR_PUBLICADO", changes: { tags: ["demostración-local"] } });
    await rejects("manage_publication_images", { ...imagesArgs, slug, action: "set_featured", featuredMediaId: cover }, "editar imágenes publicadas exige confirmación");
    await call("manage_publication_images", { ...imagesArgs, slug, action: "set_featured", featuredMediaId: cover, confirmation: "ACTUALIZAR_PUBLICADO" });
    const publicPath = `/${clinical ? "casos-clinicos" : "noticias"}/${slug}`;
    const html = await (await fetch(new URL(publicPath, endpoint))).text();
    check(html.includes("Galería de la publicación") && html.includes("carrusel"), "página pública integra carrusel al final");
    const galleryHtml = html.slice(html.indexOf('aria-roledescription="carrusel"')).split("</section>")[0];
    check((galleryHtml.match(/aria-roledescription="diapositiva"/g) || []).length === 3 && !galleryHtml.includes("/editorial-"), "carrusel público contiene solo las tres cargas dedicadas");
    gallery = await call("manage_publication_images", { ...imagesArgs, slug, action: "remove_gallery", mediaIds: gallery.gallery.map((image) => image.id), confirmation: "ACTUALIZAR_PUBLICADO" });
    const emptyHtml = await (await fetch(new URL(publicPath, endpoint))).text();
    check(gallery.gallery.length === 0 && !emptyHtml.includes('aria-roledescription="carrusel"'), "retirar todas las cargas oculta el carrusel, no la portada");
    check(gallery.featured_media_id === cover, "vaciar galería conserva la portada");
    await call("manage_publication_images", { ...imagesArgs, slug, action: "add_gallery", images: galleryUploads.slice(0, 3), confirmation: "ACTUALIZAR_PUBLICADO" });
    await rejects(archive, { slug }, "archivar exige confirmación");
    const archived = await call(archive, { slug, confirmation: "ARCHIVAR" });
    check(archived.status === "ARCHIVED" && archived.public_url === null, "archivado retira la publicación");
    check((await fetch(new URL(publicPath, endpoint))).status === 404, "publicación archivada devuelve 404");
    const archivedData = await db.content.findUnique({ where: { id: draft.id }, include: { media: true, importLogs: true } });
    check(archivedData.publishedAt === null && archivedData.media.length >= 3 && archivedData.importLogs.some((log) => log.source === `mcp:archive_${entity}`), "archivado conserva medios y auditoría");
    check((await call(archive, { slug, confirmation: "ARCHIVAR" })).changed === false, "archivar dos veces es idempotente");
    await rejects(update, { ...publishedArgs, changes: { tags: ["test"] } }, "archivado no admite edición hasta restauración");
    await rejects(publish, { slug, confirmation: "PUBLICAR" }, "publicar no restaura un archivado implícitamente");
    await rejects("manage_publication_images", { ...imagesArgs, slug, action: "set_featured", featuredMediaId: cover }, "archivado no admite cambios de imágenes");
    if (process.env.MCP_CRUD_KEEP_FIXTURES === "1") {
      await db.content.update({ where: { id: draft.id }, data: { status: "DRAFT" } });
      const restored = await call(publish, { slug, confirmation: "PUBLICAR" });
      previews.push(restored.public_url);
    }
  }
  console.log(`\n${checks} comprobaciones superadas. Sin llamadas a IA ni R2.`);
  succeeded = true;
  if (previews.length) console.log(`Vistas locales conservadas:\n${previews.join("\n")}`);
} finally {
  await client.close().catch(() => undefined);
  if (process.env.MCP_CRUD_KEEP_FIXTURES !== "1" || !succeeded) {
    await db.$transaction([
      db.mediaAsset.deleteMany({ where: { OR: [{ contentId: { in: ids } }, { id: { in: sourceIds } }] } }),
      db.importLog.deleteMany({ where: { contentId: { in: ids } } }),
      db.content.deleteMany({ where: { id: { in: ids } } })
    ]);
  }
  await db.$disconnect();
}
