import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadGeneratedImageToR2 } from "./r2";

// Decode pixels and re-encode: reject SVG/non-images and strip EXIF metadata.
export async function decodePublicationImage(value: string) {
  const base64 = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("La imagen debe enviarse como base64 PNG, JPEG o WEBP válido.");
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("Cada imagen debe pesar entre 1 byte y 10 MB.");
  const processor = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await processor.metadata();
  if (!["png", "jpeg", "webp"].includes(metadata.format || "")) throw new Error("Solo se admiten imágenes PNG, JPEG o WEBP.");
  return processor.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
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
