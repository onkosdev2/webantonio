import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadGeneratedImageToR2 } from "./r2";
import { downloadPublicationAttachment, type AttachmentDownloader, type PublicationAttachment } from "./publication-attachments";
import { MAX_PUBLICATION_IMAGE_BYTES, PublicationImageError } from "./publication-image-errors";

const supportedMime = ["image/png", "image/jpeg", "image/webp"];

function imageBytes(value: string) {
  if (value.length > 14_000_000) throw new PublicationImageError("FILE_TOO_LARGE", "La imagen supera el límite de 10 MB.");
  const base64 = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new PublicationImageError("INVALID_IMAGE_BASE64", "El contenido imageBase64 no es válido. Los clientes compatibles deben enviar el archivo adjunto.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.toString("base64").replace(/=+$/, "") !== base64.replace(/=+$/, "")) throw new PublicationImageError("INVALID_IMAGE_BASE64", "El contenido imageBase64 está incompleto o no es válido.");
  return bytes;
}

function detectedMime(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  throw new PublicationImageError("UNSUPPORTED_IMAGE_FORMAT", "Formato no soportado. Adjunta una imagen PNG, JPEG/JPG o WEBP real.");
}

// Decode actual pixels and re-encode: strip EXIF, never publish the original blob.
export async function processPublicationImage(bytes: Buffer, hints: { mimeType?: string; responseMime?: string; filename?: string; base64Mime?: string } = {}) {
  if (!bytes.length) throw new PublicationImageError("FILE_NOT_RECEIVED", "No se recibió el archivo de imagen. Vuelve a adjuntarlo.");
  if (bytes.length > MAX_PUBLICATION_IMAGE_BYTES) throw new PublicationImageError("FILE_TOO_LARGE", "La imagen supera el límite de 10 MB.");
  const mime = detectedMime(bytes);
  for (const [index, hint] of [hints.mimeType, hints.responseMime, hints.base64Mime].entries()) {
    if (hint === undefined) continue;
    const declared = hint.split(";", 1)[0].trim().toLowerCase();
    if (index === 1 && declared === "application/octet-stream") continue;
    if (!supportedMime.includes(declared) || declared !== mime) throw new PublicationImageError("INVALID_IMAGE_MIME", "MIME inválido: el tipo declarado no coincide con el contenido real de la imagen.");
  }
  if (hints.filename !== undefined) {
    if (/[\\/\x00-\x1f\x7f]/.test(hints.filename) || hints.filename === "." || hints.filename === "..") throw new PublicationImageError("INVALID_FILE_NAME", "El nombre del archivo no debe contener rutas ni caracteres de control.");
    const extension = path.extname(hints.filename).toLowerCase();
    const expected = mime === "image/jpeg" ? [".jpg", ".jpeg"] : [mime === "image/png" ? ".png" : ".webp"];
    if (!expected.includes(extension)) throw new PublicationImageError("INVALID_IMAGE_EXTENSION", "La extensión debe ser PNG, JPG/JPEG o WEBP y coincidir con el contenido real.");
  }
  try {
    const processor = sharp(bytes, { limitInputPixels: 40_000_000, animated: false, failOn: "warning" });
    const metadata = await processor.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format || "")) throw new Error("Unsupported format");
    return await processor.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  } catch {
    throw new PublicationImageError("INVALID_IMAGE_CONTENT", "El archivo está dañado, no es una imagen válida o supera el límite de 40 megapíxeles.");
  }
}

export async function resolvePublicationImage(input: { file?: PublicationAttachment; imageBase64?: string }, download: AttachmentDownloader = downloadPublicationAttachment, maxBytes = MAX_PUBLICATION_IMAGE_BYTES) {
  let original: Buffer;
  let responseMime: string | undefined;
  if (input.file) {
    const attachment = await download(input.file, Math.min(maxBytes, MAX_PUBLICATION_IMAGE_BYTES));
    original = attachment.bytes;
    responseMime = attachment.responseMime;
    // file is primary. Never silently switch sources after a download failure.
    if (input.imageBase64 !== undefined && !original.equals(imageBytes(input.imageBase64))) throw new PublicationImageError("CONFLICTING_IMAGE_SOURCES", "file e imageBase64 contienen archivos distintos. Envía solo el adjunto o el mismo archivo en ambos campos.");
  } else if (input.imageBase64 !== undefined) original = imageBytes(input.imageBase64);
  else throw new PublicationImageError("FILE_NOT_RECEIVED", "Archivo no recibido. Adjunta una imagen mediante files/file; imageBase64 se mantiene solo para clientes antiguos.");
  if (original.length > MAX_PUBLICATION_IMAGE_BYTES) throw new PublicationImageError("FILE_TOO_LARGE", "La imagen supera el límite de 10 MB.");
  if (original.length > maxBytes) throw new PublicationImageError("BATCH_TOO_LARGE", "El lote supera el límite total de 20 MB. Divide la carga en operaciones menores.");
  const dataMime = input.imageBase64?.match(/^data:(image\/[^;]+);base64,/)?.[1];
  const bytes = await processPublicationImage(original, { mimeType: input.file?.mime_type, base64Mime: dataMime, responseMime, filename: input.file?.file_name });
  return { bytes, inputBytes: original.length, hash: createHash("sha256").update(bytes).digest("hex") };
}

export async function decodePublicationImage(value: string) {
  return (await resolvePublicationImage({ imageBase64: value })).bytes;
}

export async function storePublicationImage(bytes: Buffer) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (process.env.NODE_ENV !== "production" || process.env.ONKOS_LOCAL_MEDIA === "true") {
    const directory = path.join(process.cwd(), "public", "uploads", "publications");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${hash}.webp`), bytes, { flag: "w" });
    return `/uploads/publications/${hash}.webp`;
  }
  return (await uploadGeneratedImageToR2(bytes, `publication-${hash}`, "image/webp")).url;
}
