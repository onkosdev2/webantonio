import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { z } from "zod";
import { MAX_PUBLICATION_IMAGE_BYTES, PublicationImageError } from "./publication-image-errors";

// Keep all four properties and only these two required for openai/fileParams.
export const publicationAttachmentSchema = z.object({
  download_url: z.string().min(1).max(8192).describe("URL temporal del adjunto proporcionada por el cliente; no una URL externa elegida por el modelo."),
  file_id: z.string().min(1).max(300),
  mime_type: z.string().max(120).optional(),
  file_name: z.string().max(255).optional()
}).strict();
export type PublicationAttachment = z.infer<typeof publicationAttachmentSchema>;
export type DownloadedAttachment = { bytes: Buffer; responseMime?: string };
export type AttachmentDownloader = (file: PublicationAttachment, maxBytes?: number) => Promise<DownloadedAttachment>;

const nonPublic = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]
] as const) nonPublic.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) nonPublic.addSubnet(address, prefix, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

export function isPublicAttachmentAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !nonPublic.check(address, "ipv4")
    : family === 6 && globalV6.check(address, "ipv6") && !nonPublic.check(address, "ipv6");
}

function attachmentUrl(file: PublicationAttachment, allowedHosts: string[]) {
  let url: URL;
  try { url = new URL(file.download_url); }
  catch { throw new PublicationImageError("INVALID_FILE_REFERENCE", "La referencia del archivo no es válida. Vuelve a adjuntar el archivo."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443") || isIP(url.hostname) || url.hostname.endsWith(".")) {
    throw new PublicationImageError("INVALID_FILE_REFERENCE", "El adjunto requiere una referencia HTTPS temporal, sin credenciales, puertos alternativos ni rutas locales.");
  }
  if (!allowedHosts.length) throw new PublicationImageError("ATTACHMENT_HOST_NOT_CONFIGURED", "Falta configurar MCP_ATTACHMENT_ALLOWED_HOSTS con los hosts de adjuntos verificados del cliente. No envíes una URL externa ni conviertas manualmente el archivo.");
  if (!allowedHosts.includes(url.hostname)) throw new PublicationImageError("ATTACHMENT_HOST_NOT_ALLOWED", "El host del adjunto no está autorizado. Usa una referencia del cliente MCP y solicita al administrador verificar su host.");
  return url;
}

// Dependencies are injectable only by server-side tests, never via MCP arguments.
export function createAttachmentDownloader(dependencies: {
  lookup?: typeof lookup;
  request?: typeof request;
  allowedHosts?: () => string[];
  timeoutMs?: number;
} = {}): AttachmentDownloader {
  const resolve = dependencies.lookup ?? lookup;
  const send = dependencies.request ?? request;
  return async (file, maxBytes = MAX_PUBLICATION_IMAGE_BYTES) => {
    const hosts = dependencies.allowedHosts?.() ?? (process.env.MCP_ATTACHMENT_ALLOWED_HOSTS || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
    const url = attachmentUrl(file, hosts);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 15_000);
    try {
      const addresses = await Promise.race([
        resolve(url.hostname, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new PublicationImageError("ATTACHMENT_TIMEOUT", "La descarga del adjunto agotó el tiempo disponible. Vuelve a adjuntar el archivo.")), { once: true }))
      ]);
      if (!addresses.length || addresses.some(({ address }) => !isPublicAttachmentAddress(address))) throw new PublicationImageError("UNSAFE_ATTACHMENT_ADDRESS", "La referencia del adjunto apunta a una red no permitida.");
      const selected = addresses[0];
      return await new Promise<DownloadedAttachment>((resolveBody, reject) => {
        const req = send(url, {
          method: "GET", agent: false, family: selected.family,
          // Pin the validated address, preserving the URL hostname for TLS/SNI.
          lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
          signal: controller.signal,
          headers: { Accept: "image/png, image/jpeg, image/webp", "Accept-Encoding": "identity" }
        }, (response) => {
          const fail = (code: string, message: string) => { response.destroy(); reject(new PublicationImageError(code, message)); };
          const status = response.statusCode ?? 0;
          if ([401, 403, 404, 410].includes(status)) return fail("ATTACHMENT_EXPIRED", "El adjunto venció o no está disponible. Vuelve a adjuntarlo para obtener una referencia nueva.");
          if (status !== 200) return fail("ATTACHMENT_DOWNLOAD_FAILED", "No se pudo descargar el adjunto. No se siguen redirecciones; solicita una referencia nueva al cliente.");
          if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") return fail("INVALID_ATTACHMENT_ENCODING", "El adjunto usa una codificación de transporte no admitida.");
          const size = response.headers["content-length"];
          if (size && (!/^\d+$/.test(size) || Number(size) > maxBytes)) return fail("FILE_TOO_LARGE", "El archivo supera el límite de 10 MB por imagen o 20 MB por operación.");
          const chunks: Buffer[] = [];
          let received = 0;
          response.on("data", (chunk: Buffer) => {
            received += chunk.length;
            if (received > maxBytes) { fail("FILE_TOO_LARGE", "El archivo supera el límite de 10 MB por imagen o 20 MB por operación."); return; }
            chunks.push(Buffer.from(chunk));
          });
          response.on("error", reject);
          response.on("aborted", () => reject(new PublicationImageError("ATTACHMENT_DOWNLOAD_FAILED", "La descarga del adjunto se interrumpió. Vuelve a adjuntar el archivo.")));
          response.on("end", () => {
            if (!received) return reject(new PublicationImageError("FILE_NOT_RECEIVED", "No se recibió contenido en el archivo adjunto. Vuelve a adjuntarlo."));
            if (size !== undefined && received !== Number(size)) return reject(new PublicationImageError("ATTACHMENT_DOWNLOAD_FAILED", "El adjunto llegó incompleto. Vuelve a adjuntar el archivo."));
            resolveBody({ bytes: Buffer.concat(chunks, received), responseMime: response.headers["content-type"] });
          });
        });
        req.on("error", reject);
        req.end();
      });
    } catch (error) {
      if (error instanceof PublicationImageError) throw error;
      if (controller.signal.aborted) throw new PublicationImageError("ATTACHMENT_TIMEOUT", "La descarga del adjunto agotó el tiempo disponible. Vuelve a adjuntar el archivo.");
      // Never expose signed URLs, file tokens, headers, or low-level network errors.
      throw new PublicationImageError("ATTACHMENT_DOWNLOAD_FAILED", "No se pudo descargar el adjunto de forma segura. Vuelve a adjuntarlo y comprueba la configuración del servidor.");
    } finally { clearTimeout(timer); }
  };
}

export const downloadPublicationAttachment = createAttachmentDownloader();
