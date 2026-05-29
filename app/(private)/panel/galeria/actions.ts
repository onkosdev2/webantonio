"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
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
  const linkedContentId = await resolveLinkedContentId(
    getText(formData, "linkedContentSlug")
  );

  const created = await db.mediaAsset.create({
    data: {
      title: getText(formData, "title"),
      altText: getText(formData, "altText"),
      storagePath: getText(formData, "storagePath"),
      mediaType: getText(formData, "mediaType") || "image",
      isSensitive: getBoolean(formData, "isSensitive"),
      contentId: linkedContentId
    }
  });

  revalidatePath("/galeria");
  revalidatePath("/panel/galeria");
  redirect(`/panel/galeria/${created.id}`);
}

export async function updateGalleryAssetAction(id: string, formData: FormData) {
  const linkedContentId = await resolveLinkedContentId(
    getText(formData, "linkedContentSlug")
  );

  await db.mediaAsset.update({
    where: { id },
    data: {
      title: getText(formData, "title"),
      altText: getText(formData, "altText"),
      storagePath: getText(formData, "storagePath"),
      mediaType: getText(formData, "mediaType") || "image",
      isSensitive: getBoolean(formData, "isSensitive"),
      contentId: linkedContentId
    }
  });

  revalidatePath("/galeria");
  revalidatePath("/panel/galeria");
  revalidatePath(`/panel/galeria/${id}`);
  redirect(`/panel/galeria/${id}`);
}
