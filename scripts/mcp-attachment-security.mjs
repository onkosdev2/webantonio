import assert from "node:assert/strict";
import sharp from "sharp";
import { attachmentRef, attachmentTransport } from "./fixtures/attachment-downloads.mjs";
import { createAttachmentDownloader, isPublicAttachmentAddress } from "../lib/storage/publication-attachments.ts";
import { processPublicationImage, resolvePublicationImage } from "../lib/storage/publication-images.ts";

let checks = 0;
function check(value, message) { assert(value, message); console.log(`OK ${++checks}: ${message}`); }
async function rejects(action, code, message) { await assert.rejects(action, (error) => error.code === code); check(true, message); }
const png = await sharp({ create: { width: 12, height: 10, channels: 3, background: "#274a41" } }).png().toBuffer();
const fixture = attachmentTransport(new Map([["/image.png", { bytes: png, mime: "image/png" }]]));
const download = createAttachmentDownloader(fixture.dependencies);
const file = attachmentRef("image.png", "image/png");
check((await download(file)).bytes.equals(png), "descarga binaria con IP fijada y sin reenviar credenciales");
check((await resolvePublicationImage({ file }, download)).inputBytes === png.length, "procesa archivo sin conversión Base64 intermedia");
check((await resolvePublicationImage({ file, imageBase64: png.toString("base64") }, download)).bytes.length > 0, "file prioritario acepta fallback idéntico");
await rejects(() => resolvePublicationImage({ file, imageBase64: Buffer.from("different").toString("base64") }, download), "CONFLICTING_IMAGE_SOURCES", "rechaza conflicto entre file y Base64");
await rejects(() => resolvePublicationImage({ file, imageBase64: `data:image/jpeg;base64,${png.toString("base64")}` }, download), "INVALID_IMAGE_MIME", "el MIME del fallback no puede contradecir el archivo principal");
await rejects(() => resolvePublicationImage({}, download), "FILE_NOT_RECEIVED", "error accionable si falta archivo");
await rejects(() => download({ ...file, download_url: "https://evil.example/image.png" }), "ATTACHMENT_HOST_NOT_ALLOWED", "rechaza URL externa arbitraria");
for (const url of ["http://attachments.example.com/image.png", "file:///etc/passwd", "https://user:secret@attachments.example.com/image.png", "https://attachments.example.com:444/image.png", "https://attachments.example.com/image.png#fragment", "https://attachments.example.com.evil.example/image.png"]) {
  await assert.rejects(() => download({ ...file, download_url: url }));
}
check(true, "rechaza HTTP, rutas locales, credenciales, puertos, fragmentos y hosts engañosos");
await rejects(() => createAttachmentDownloader({ ...fixture.dependencies, allowedHosts: () => [] })(file), "ATTACHMENT_HOST_NOT_CONFIGURED", "sin hosts verificados no habilita descargas");
for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.0.1", "100.64.0.1", "0.0.0.0", "203.0.113.1", "224.0.0.1", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1", "2002:7f00:1::"]) check(!isPublicAttachmentAddress(address), `bloquea dirección no pública ${address}`);
check(isPublicAttachmentAddress("1.1.1.1") && isPublicAttachmentAddress("2001:4860:4860::8888"), "admite IPv4 e IPv6 públicas");
const beforeDns = fixture.calls.length;
await rejects(() => createAttachmentDownloader({ ...fixture.dependencies, lookup: async () => [{ address: "1.1.1.1", family: 4 }, { address: "127.0.0.1", family: 4 }] })(file), "UNSAFE_ATTACHMENT_ADDRESS", "DNS mixto no habilita acceso privado ni rebinding");
check(fixture.calls.length === beforeDns, "rechazo DNS ocurre antes de abrir conexión");
fixture.fixtures.set("/redirect.png", { status: 302, headers: { location: "http://127.0.0.1/private" } });
await rejects(() => download(attachmentRef("redirect.png")), "ATTACHMENT_DOWNLOAD_FAILED", "no sigue redirecciones");
fixture.fixtures.set("/expired.png", { status: 403 });
await rejects(() => resolvePublicationImage({ file: attachmentRef("expired.png"), imageBase64: png.toString("base64") }, download), "ATTACHMENT_EXPIRED", "adjunto vencido no usa Base64 silenciosamente");
fixture.fixtures.set("/large.png", { bytes: png, headers: { "content-length": String(10 * 1024 * 1024 + 1) } });
await rejects(() => download(attachmentRef("large.png")), "FILE_TOO_LARGE", "limita tamaño anunciado antes de leer");
fixture.fixtures.set("/chunked.png", { chunks: [Buffer.alloc(6 * 1024 * 1024), Buffer.alloc(6 * 1024 * 1024)], headers: {} });
await rejects(() => download(attachmentRef("chunked.png")), "FILE_TOO_LARGE", "limita streaming sin Content-Length");
fixture.fixtures.set("/empty.png", { bytes: Buffer.alloc(0) });
await rejects(() => download(attachmentRef("empty.png")), "FILE_NOT_RECEIVED", "rechaza adjunto vacío");
fixture.fixtures.set("/incomplete.png", { bytes: png, headers: { "content-length": String(png.length + 1) } });
await rejects(() => download(attachmentRef("incomplete.png")), "ATTACHMENT_DOWNLOAD_FAILED", "rechaza descarga incompleta aunque sus bytes formen una imagen válida");
fixture.fixtures.set("/gzip.png", { bytes: png, headers: { "content-encoding": "gzip" } });
await rejects(() => download(attachmentRef("gzip.png")), "INVALID_ATTACHMENT_ENCODING", "rechaza expansión mediante compresión HTTP");
fixture.fixtures.set("/slow.png", { hang: true });
await rejects(() => createAttachmentDownloader({ ...fixture.dependencies, timeoutMs: 20 })(attachmentRef("slow.png")), "ATTACHMENT_TIMEOUT", "aplica tiempo máximo de descarga");
await rejects(() => createAttachmentDownloader({ ...fixture.dependencies, timeoutMs: 20, lookup: () => new Promise(() => {}) })(file), "ATTACHMENT_TIMEOUT", "el límite de tiempo también cubre DNS");
for (const hints of [{ mimeType: "image/jpeg" }, { mimeType: "text/html" }, { responseMime: "text/html" }]) await rejects(() => processPublicationImage(png, hints), "INVALID_IMAGE_MIME", "contrasta MIME declarado con bytes reales");
await rejects(() => processPublicationImage(png, { filename: "../../secret.png" }), "INVALID_FILE_NAME", "rechaza path traversal en nombre recibido");
await rejects(() => processPublicationImage(png, { filename: "image.jpg" }), "INVALID_IMAGE_EXTENSION", "extensión debe coincidir con contenido");
await rejects(() => processPublicationImage(Buffer.from("<svg></svg>")), "UNSUPPORTED_IMAGE_FORMAT", "rechaza SVG incluso si aparenta imagen");
await rejects(() => processPublicationImage(png.subarray(0, 16)), "INVALID_IMAGE_CONTENT", "decodifica píxeles y rechaza archivo truncado");
await rejects(() => processPublicationImage(Buffer.alloc(10 * 1024 * 1024 + 1)), "FILE_TOO_LARGE", "limita tamaño real antes de decodificar");
const withExif = await sharp(png).withMetadata({ exif: { IFD0: { Artist: "Synthetic fixture metadata" } } }).jpeg().toBuffer();
const processed = await processPublicationImage(withExif, { mimeType: "image/jpeg", filename: "safe.jpg" });
const metadata = await sharp(processed).metadata();
check(metadata.format === "webp" && !metadata.exif && !metadata.icc, "almacena copia WebP sin EXIF ni perfiles originales");
console.log(`\n${checks} comprobaciones de seguridad de adjuntos superadas; sin red externa ni base de producción.`);
