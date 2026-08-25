const MARKDOWN_IMAGE = /^\\?!\[([^\]]*)\]\(\s*(?:<([^>]+)>|(\S+?))(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*\)$/;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string) {
  return escapeHtml(text.replace(/\\([*_#])/g, "$1"))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_([^_]+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

export function markdownToEditorHtml(value: string) {
  if (!value.trim()) return "";

  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "");

  if (/<(?:p|h[1-6]|blockquote|img|ul|ol|table)\b[\s\S]*>/i.test(normalized)) {
    return normalized;
  }

  const output: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    output.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    listItems = [];
    listType = null;
  };

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const image = line.match(MARKDOWN_IMAGE);
    if (image) {
      flushParagraph();
      flushList();
      const src = image[2] ?? image[3] ?? "";
      const title = image[4] ?? image[5];
      output.push(`<img src="${escapeHtml(src)}" alt="${escapeHtml(image[1] ?? "")}"${title ? ` title="${escapeHtml(title)}"` : ""}>`);
      continue;
    }

    const heading = line.match(/^\\?(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(?:---|___|\*\*\*)$/.test(line)) {
      flushParagraph();
      flushList();
      output.push("<hr>");
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      output.push(`<blockquote><p>${inlineMarkdown(line.slice(2))}</p></blockquote>`);
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      flushParagraph();
      const nextType = bullet ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((bullet?.[1] ?? ordered?.[1]) || "");
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return output.join("");
}
