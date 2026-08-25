"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkle, UserCircle, X } from "@phosphor-icons/react";
import styles from "./clinical-cases-live-updates.module.css";

type PublicationUpdate = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  href: string;
  origin: {
    type: "CHATGPT_MCP" | "PANEL_USER";
    label: string;
    description: string;
  };
};

type PublicationKind = "clinical-case" | "news";

const publicationConfig = {
  "clinical-case": {
    endpoint: "/api/public/clinical-cases/stream",
    label: "Nuevo caso publicado"
  },
  news: {
    endpoint: "/api/public/news/stream",
    label: "Nueva noticia publicada"
  }
} as const;

function PublicationLiveUpdates({ kind }: { kind: PublicationKind }) {
  const router = useRouter();
  const [notification, setNotification] = useState<PublicationUpdate | null>(null);
  const config = publicationConfig[kind];

  useEffect(() => {
    const source = new EventSource(config.endpoint);
    const handlePublication = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as PublicationUpdate;
        setNotification(event);
        router.refresh();
      } catch {
        // Ignora eventos incompletos y conserva la conexión activa.
      }
    };

    source.addEventListener("publication", handlePublication as EventListener);

    return () => {
      source.removeEventListener("publication", handlePublication as EventListener);
      source.close();
    };
  }, [config.endpoint, router]);

  useEffect(() => {
    if (!notification) return;

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 60_000);

    return () => window.clearTimeout(timeout);
  }, [notification]);

  if (!notification) return null;

  const OriginIcon = notification.origin.type === "CHATGPT_MCP" ? Sparkle : UserCircle;

  return (
    <aside
      className={styles.notification}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.topline}>
        <span className={styles.signal} aria-hidden="true" />
        <p>{config.label}</p>
        <button
          type="button"
          onClick={() => setNotification(null)}
          aria-label="Cerrar notificación"
        >
          <X size={17} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <a className={styles.publicationLink} href={notification.href}>
        <strong>{notification.title}</strong>
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>

      <div className={styles.origin}>
        <OriginIcon size={14} weight="duotone" aria-hidden="true" />
        <span>{notification.origin.label}</span>
      </div>
    </aside>
  );
}

export function ClinicalCasesLiveUpdates() {
  return <PublicationLiveUpdates kind="clinical-case" />;
}

export function NewsLiveUpdates() {
  return <PublicationLiveUpdates kind="news" />;
}
