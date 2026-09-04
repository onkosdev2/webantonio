import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Test-only signed tokens for an isolated production-mode server; never real credentials.
const database = new URL(process.env.DATABASE_URL || "");
const endpoint = new URL(process.env.MCP_CRUD_AUTH_URL || "http://127.0.0.1:3002/mcp");
const secret = "onkos-isolated-local-auth-test-only";
assert(["127.0.0.1", "localhost"].includes(database.hostname) && database.pathname.endsWith("_test"));
assert(["127.0.0.1", "localhost"].includes(endpoint.hostname));
assert.equal(process.env.AUTH_SECRET, secret, "Esta prueba solo admite su secreto aislado.");
const db = new PrismaClient();
let user;
let checks = 0;
const stamp = Date.now();
const slug = `mcp-scope-test-${stamp}`;
let content;
function check(condition, label) { assert(condition, label); console.log(`OK ${++checks}: ${label}`); }
function token(scope, overrides = {}) {
  const payload = Buffer.from(JSON.stringify({ purpose: "access_token", userId: user.id, clientId: "isolated-test", resource: `${process.env.NEXT_PUBLIC_SITE_URL}/mcp`, scope, issuedAt: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, ...overrides })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
async function rpc(method, params, bearer) {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return { status: response.status, body: await response.json() };
}
try {
  user = await db.user.create({ data: { name: "Prueba de permisos MCP", email: `mcp-scope-${stamp}@example.invalid`, active: true, mustChangePassword: false } });
  content = await db.content.create({ data: { slug, type: "NEWS_ITEM", title: "Prueba local de permisos del MCP", summary: "Contenido ficticio para la prueba local de autorización.", body: "Prueba técnica local, sin publicación ni información clínica." } });
  check((await rpc("tools/list", {})).status === 401, "producción rechaza acceso sin token");
  check((await rpc("tools/list", {}, "invalid-test-token")).status === 401, "rechaza token inválido");
  const readToken = token("mcp:read");
  const listed = await rpc("tools/list", {}, readToken);
  check(listed.status === 200 && listed.body.result.tools.length === 22, "permiso de lectura permite descubrir 22 herramientas");
  const read = await rpc("tools/call", { name: "get_news_item", arguments: { slug } }, readToken);
  check(read.status === 200 && !read.body.result.isError, "permiso de lectura permite consultar contenido");
  const args = { name: "archive_news_item", arguments: { slug, confirmation: "ARCHIVAR" } };
  check((await rpc("tools/call", args, readToken)).status === 401, "permiso de lectura no permite archivar");
  check((await db.content.findUnique({ where: { id: content.id } })).status === "DRAFT", "rechazo de permisos no modifica la base");
  check((await rpc("tools/call", args, token("mcp:write"))).status === 401, "escritura también exige permiso de lectura");
  const attachmentArgs = { name: "manage_publication_images", arguments: {
    entity: "news_item", slug, action: "add_gallery",
    files: [{ download_url: "https://unconfigured.example.invalid/test.png", file_id: "local-auth-fixture", mime_type: "image/png", file_name: "test.png" }],
    images: [{ title: "Adjunto de permisos", altText: "Imagen sintética para probar permisos, sin datos personales." }]
  } };
  for (const [bearer, label] of [[undefined, "sin token"], [readToken, "solo lectura"], [token("mcp:write"), "solo escritura"]]) {
    check((await rpc("tools/call", attachmentArgs, bearer)).status === 401, `adjuntos rechazan ${label} antes del handler`);
  }
  const authorizedAttachment = await rpc("tools/call", attachmentArgs, token("mcp:read mcp:write"));
  check(authorizedAttachment.status === 200 && ["ATTACHMENT_HOST_NOT_CONFIGURED", "ATTACHMENT_HOST_NOT_ALLOWED"].includes(authorizedAttachment.body.result?.structuredContent?.error?.code), "lectura y escritura llegan a validación segura del adjunto sin descargar URLs externas");
  check(await db.mediaAsset.count({ where: { contentId: content.id } }) === 0, "los rechazos de adjuntos no crean medios");
  check((await rpc("tools/list", {}, token("mcp:read", { resource: "https://example.invalid/mcp" }))).status === 401, "rechaza audiencia incorrecta");
  check((await rpc("tools/list", {}, token("mcp:read", { exp: 1 }))).status === 401, "rechaza token vencido");
  const archived = await rpc("tools/call", args, token("mcp:read mcp:write"));
  check(archived.status === 200 && !archived.body.result.isError && (await db.content.findUnique({ where: { id: content.id } })).status === "ARCHIVED", "lectura y escritura permiten archivado confirmado");
  console.log(`\n${checks} comprobaciones de autorización superadas en producción local.`);
} finally {
  if (content) {
    await db.importLog.deleteMany({ where: { contentId: content.id } });
    await db.content.delete({ where: { id: content.id } });
  }
  if (user) await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
