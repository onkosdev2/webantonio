const publicationDateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "long",
  year: "numeric"
});

const publicationTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

export type PublicPublicationDate = {
  label: string;
  dateLabel: string;
  timeLabel: string;
  dateTime: string;
};

export function formatPublicPublicationDate(
  publishedAt: Date | string | null | undefined,
  fallback?: Date | string | null
) {
  const value = publishedAt ?? fallback;

  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const dateLabel = publicationDateFormatter.format(date);
  const timeLabel = publicationTimeFormatter.format(date);

  return {
    label: `Publicado el ${dateLabel} a las ${timeLabel}`,
    dateLabel,
    timeLabel,
    dateTime: date.toISOString()
  } satisfies PublicPublicationDate;
}
