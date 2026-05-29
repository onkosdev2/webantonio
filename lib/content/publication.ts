import { ContentStatus } from "@prisma/client";

const publicationIntentMap = {
  save_draft: ContentStatus.DRAFT,
  send_review: ContentStatus.PENDING_REVIEW,
  publish: ContentStatus.PUBLISHED,
  archive: ContentStatus.ARCHIVED
} as const;

type PublicationIntent = keyof typeof publicationIntentMap;

export function parseContentStatus(
  value: FormDataEntryValue | null,
  fallback: ContentStatus = ContentStatus.DRAFT
) {
  const candidate = typeof value === "string" ? value : fallback;

  if (Object.values(ContentStatus).includes(candidate as ContentStatus)) {
    return candidate as ContentStatus;
  }

  return fallback;
}

export function getFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function resolveEditorialStatus(
  formData: FormData,
  fallback: ContentStatus = ContentStatus.DRAFT
) {
  const intent = getFormText(formData, "intent") as PublicationIntent;

  if (intent in publicationIntentMap) {
    return publicationIntentMap[intent];
  }

  return parseContentStatus(formData.get("status"), fallback);
}

export function resolvePublicationFields(
  nextStatus: ContentStatus,
  currentPublishedAt: Date | null = null
) {
  if (nextStatus === ContentStatus.PUBLISHED) {
    return {
      status: nextStatus,
      publishedAt: currentPublishedAt ?? new Date()
    };
  }

  return {
    status: nextStatus,
    publishedAt: null
  };
}
