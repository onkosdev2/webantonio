import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const allowedMimeTypes = new Map([
  ["image/jpeg", { extension: "jpg", mediaType: "image", maxBytes: 10 * 1024 * 1024 }],
  ["image/png", { extension: "png", mediaType: "image", maxBytes: 10 * 1024 * 1024 }],
  ["image/webp", { extension: "webp", mediaType: "image", maxBytes: 10 * 1024 * 1024 }],
  ["video/mp4", { extension: "mp4", mediaType: "video", maxBytes: 100 * 1024 * 1024 }],
  ["video/webm", { extension: "webm", mediaType: "video", maxBytes: 100 * 1024 * 1024 }]
]);

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error("Falta configurar " + name + " para subir archivos a R2.");
  }

  return value;
}

export function isAllowedPublicMediaUrl(value: string) {
  if (value.startsWith("/")) {
    return true;
  }

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

  if (!publicBaseUrl) {
    return false;
  }

  return value.startsWith(`${publicBaseUrl}/`);
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY")
    }
  });
}

function normalizeFilename(name: string) {
  const base = name
    .split(".")
    .slice(0, -1)
    .join(".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "media";
}

export function resolveUploadedMediaType(mimeType: string) {
  return allowedMimeTypes.get(mimeType)?.mediaType ?? "";
}

export async function uploadGalleryFileToR2(file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  const config = allowedMimeTypes.get(file.type);

  if (!config) {
    throw new Error("Formato no permitido. Usa JPG, PNG, WEBP, MP4 o WEBM.");
  }

  if (file.size > config.maxBytes) {
    throw new Error(
      config.mediaType === "video"
        ? "El video supera el limite de 100 MB."
        : "La imagen supera el limite de 10 MB."
    );
  }

  const bucket = getRequiredEnv("R2_BUCKET");
  const publicBaseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  const key = [
    "gallery",
    new Date().toISOString().slice(0, 10),
    Date.now() + "-" + randomUUID() + "-" + normalizeFilename(file.name) + "." + config.extension
  ].join("/");
  const body = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return {
    key,
    url: publicBaseUrl + "/" + key,
    mediaType: config.mediaType,
    contentType: file.type,
    size: file.size
  };
}

export async function uploadGeneratedImageToR2(
  body: Buffer,
  filename: string,
  contentType = "image/webp"
) {
  const bucket = getRequiredEnv("R2_BUCKET");
  const publicBaseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  const extension = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const key = [
    "generated",
    new Date().toISOString().slice(0, 10),
    `${Date.now()}-${randomUUID()}-${normalizeFilename(filename)}.${extension}`
  ].join("/");

  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable"
  }));

  return { key, url: `${publicBaseUrl}/${key}` };
}

export async function deleteR2ObjectByPublicUrl(url: string) {
  const publicBaseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  if (!url.startsWith(`${publicBaseUrl}/`)) return;
  const key = decodeURIComponent(url.slice(publicBaseUrl.length + 1));
  await getR2Client().send(new DeleteObjectCommand({
    Bucket: getRequiredEnv("R2_BUCKET"),
    Key: key
  }));
}
