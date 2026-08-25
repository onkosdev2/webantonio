export type ClinicalCasePublicationEvent = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  href: string;
  origin: {
    type: "CHATGPT_MCP" | "PANEL_USER";
    label: string;
    description: string;
  };
};

export type NewsPublicationEvent = ClinicalCasePublicationEvent;

type PublicationListener = (event: ClinicalCasePublicationEvent) => void;
type NewsPublicationListener = (event: NewsPublicationEvent) => void;

declare global {
  var __clinicalCasePublicationListeners__: Set<PublicationListener> | undefined;
  var __newsPublicationListeners__: Set<NewsPublicationListener> | undefined;
}

const listeners =
  globalThis.__clinicalCasePublicationListeners__ ?? new Set<PublicationListener>();

globalThis.__clinicalCasePublicationListeners__ = listeners;

const newsListeners =
  globalThis.__newsPublicationListeners__ ?? new Set<NewsPublicationListener>();

globalThis.__newsPublicationListeners__ = newsListeners;

export function subscribeToClinicalCasePublications(listener: PublicationListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitClinicalCasePublication(event: ClinicalCasePublicationEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeToNewsPublications(listener: NewsPublicationListener) {
  newsListeners.add(listener);
  return () => {
    newsListeners.delete(listener);
  };
}

export function emitNewsPublication(event: NewsPublicationEvent) {
  for (const listener of newsListeners) listener(event);
}
