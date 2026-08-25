import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/auth/session";
import { deleteR2ObjectByPublicUrl } from "@/lib/storage/r2";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getApiUser()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;
  const asset = await db.mediaAsset.findUnique({
    where: { id },
    include: { content: { select: { slug: true } } }
  });
  if (!asset) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  await deleteR2ObjectByPublicUrl(asset.storagePath);
  await db.mediaAsset.delete({ where: { id } });
  if (asset.content?.slug) {
    revalidatePath(`/casos-clinicos/${asset.content.slug}`);
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getApiUser()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json() as { action?: string; altText?: string; title?: string };
  const asset = await db.mediaAsset.findUnique({
    where: { id },
    include: { content: { select: { slug: true } } }
  });
  if (!asset) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  let updated;
  if (body.action === "feature" && asset.contentId) {
    const [, featured] = await db.$transaction([
      db.mediaAsset.updateMany({ where: { contentId: asset.contentId }, data: { isFeatured: false } }),
      db.mediaAsset.update({ where: { id }, data: { isFeatured: true } })
    ]);
    updated = featured;
  } else {
    updated = await db.mediaAsset.update({
      where: { id },
      data: {
        title: body.title?.trim() || undefined,
        altText: body.altText?.trim() || undefined
      }
    });
  }
  if (asset.content?.slug) {
    revalidatePath(`/casos-clinicos/${asset.content.slug}`);
  }
  return NextResponse.json({ ok: true, asset: updated });
}
