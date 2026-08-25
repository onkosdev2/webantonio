import { Clock } from "@phosphor-icons/react/dist/ssr";
import type { PublicPublicationDate } from "@/lib/content/public-dates";
import styles from "./publication-date-time.module.css";

type PublicationDateTimeProps = {
  value: PublicPublicationDate;
  variant: "card" | "article";
};

export function PublicationDateTime({ value, variant }: PublicationDateTimeProps) {
  return (
    <time
      className={`${styles.root} ${styles[variant]}`}
      dateTime={value.dateTime}
      aria-label={value.label}
    >
      <Clock size={variant === "article" ? 15 : 13} aria-hidden="true" />
      <span className={styles.label}>Publicado</span>
      <strong>{value.dateLabel}</strong>
      <span className={styles.separator} aria-hidden="true">·</span>
      <span className={styles.time}>{value.timeLabel}</span>
    </time>
  );
}
