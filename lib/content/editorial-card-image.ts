export type EditorialCardImage = {
  src: string;
  alt: string;
  origin?: string;
};

function safeImageSource(value: string) {
  const source = value.trim();
  if (source.startsWith("/") && !source.startsWith("//")) return source;

  try {
    const url = new URL(source);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash
      ? source
      : null;
  } catch {
    return null;
  }
}

export function firstEditorialBodyImage(body: string): EditorialCardImage | null {
  const markdownImage = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/m.exec(body);
  if (markdownImage) {
    const src = safeImageSource(markdownImage[2]);
    if (src) return { src, alt: markdownImage[1].trim() || "Imagen editorial", origin: "upload" };
  }

  const standaloneImageUrl = /^\s*(https:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?[^\s]*)?)\s*$/im.exec(body);
  if (standaloneImageUrl) {
    const src = safeImageSource(standaloneImageUrl[1]);
    if (src) return { src, alt: "Imagen editorial", origin: "upload" };
  }

  return null;
}
