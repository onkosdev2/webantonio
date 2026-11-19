import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { absoluteUrl } from "@/lib/seo";

/**
 * Versión liviana (JPEG 1200x630, ~100 KB) de la imagen destacada para las
 * vistas previas al compartir (WhatsApp, Facebook, LinkedIn, X). WhatsApp
 * descarta imágenes de más de ~300 KB, y las imágenes destacadas originales
 * son PNG de 0,6 a 2 MB.
 *
 * Solo acepta imágenes del bucket público de R2 o de la carpeta /public, para
 * que la ruta no pueda usarse para descargar contenido de otros sitios.
 */
export const runtime = "nodejs";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const PUBLIC_DIR = path.join(process.cwd(), "public");

function allowedRemoteBase() {
  return process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || null;
}

async function loadRemote(src: string) {
  const base = allowedRemoteBase();
  if (!base || !src.startsWith(`${base}/`)) return null;

  const response = await fetch(src, {
    signal: AbortSignal.timeout(15_000),
    redirect: "error"
  });
  if (!response.ok) return null;

  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_SOURCE_BYTES) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.length > MAX_SOURCE_BYTES ? null : buffer;
}

async function loadLocal(src: string) {
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  const pathname = decodeURIComponent(src.split(/[?#]/)[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";

  let source: Buffer | null = null;
  try {
    source = src.startsWith("http") ? await loadRemote(src) : await loadLocal(src);
  } catch {
    source = null;
  }

  if (!source) {
    // Sin imagen válida: se usa la imagen general del sitio.
    return Response.redirect(absoluteUrl("/og-default.jpg"), 302);
  }

  try {
    const output = await sharp(source, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "attention" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(output.length),
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400"
      }
    });
  } catch {
    return Response.redirect(absoluteUrl("/og-default.jpg"), 302);
  }
}
