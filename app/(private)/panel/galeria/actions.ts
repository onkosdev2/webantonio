"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateGalleryMetadataWithGlm } from "@/lib/ai/glm";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function buildGalleryPayload(formData: FormData) {
  return {
    title: getText(formData, "title"),
    altText: getText(formData, "altText"),
    storagePath: getText(formData, "storagePath"),
    mediaType: getText(formData, "mediaType") || "image",
    linkedContentSlug: getText(formData, "linkedContentSlug"),
    brief: getText(formData, "brief"),
    isSensitive: getBoolean(formData, "isSensitive")
  };
}

function resolveGalleryTitle(payload: ReturnType<typeof buildGalleryPayload>) {
  return (
    payload.title ||
    payload.brief.split("\n")[0]?.trim() ||
    payload.storagePath.split("/").pop()?.trim() ||
    "Activo visual clinico"
  );
}

async function enrichGalleryPayload(payload: ReturnType<typeof buildGalleryPayload>) {
  const generated = await generateGalleryMetadataWithGlm({
    title: payload.title,
    altText: payload.altText,
    mediaType: payload.mediaType,
    linkedContentSlug: payload.linkedContentSlug,
    brief: payload.brief
  });

  return {
    ...payload,
    title: generated.title,
    altText: generated.altText,
    mediaType: generated.mediaType
  };
}

async function resolveLinkedContentId(slug: string) {
  if (!slug) {
    return null;
  }

  const item = await db.content.findUnique({
    where: { slug },
    select: { id: true }
  });

  return item?.id ?? null;
}

export async function createGalleryAssetAction(formData: FormData) {
  const intent = getText(formData, "intent");
  const basePayload = buildGalleryPayload(formData);
  const payload = intent === "ai_enrich" ? await enrichGalleryPayload(basePayload) : basePayload;
  const linkedContentId = await resolveLinkedContentId(payload.linkedContentSlug);

  const created = await db.mediaAsset.create({
    data: {
      title: resolveGalleryTitle(payload),
      altText: payload.altText,
      storagePath: payload.storagePath,
      mediaType: payload.mediaType,
      isSensitive: payload.isSensitive,
      contentId: linkedContentId
    }
  });

  revalidatePath("/galeria");
  revalidatePath("/panel/galeria");
  redirect(`/panel/galeria/${created.id}`);
}

export async function updateGalleryAssetAction(id: string, formData: FormData) {
  const intent = getText(formData, "intent");
  const basePayload = buildGalleryPayload(formData);
  const payload = intent === "ai_enrich" ? await enrichGalleryPayload(basePayload) : basePayload;
  const linkedContentId = await resolveLinkedContentId(payload.linkedContentSlug);

  await db.mediaAsset.update({
    where: { id },
    data: {
      title: resolveGalleryTitle(payload),
      altText: payload.altText,
      storagePath: payload.storagePath,
      mediaType: payload.mediaType,
      isSensitive: payload.isSensitive,
      contentId: linkedContentId
    }
  });

  revalidatePath("/galeria");
  revalidatePath("/panel/galeria");
  revalidatePath(`/panel/galeria/${id}`);
  redirect(`/panel/galeria/${id}`);
}
