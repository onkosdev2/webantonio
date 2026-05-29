"use server";

import { ContentType, ImportState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { splitCommaSeparated } from "@/lib/content/cases";
import { createDraftViaMcp } from "@/lib/mcp/server";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mapPayloadTypeToDraftType(payloadType: string) {
  switch (payloadType) {
    case "clinical_case":
      return "clinical_case";
    case "news_item":
      return "news_item";
    case "reflection":
      return "reflection";
    case "editorial":
    default:
      return "editorial";
  }
}

export async function createImportAction(formData: FormData) {
  const channel = getText(formData, "channel") || "manual";
  const source = getText(formData, "source");
  const payloadType = getText(formData, "payloadType");
  const title = getText(formData, "title");
  const summary = getText(formData, "summary");
  const body = getText(formData, "body");
  const tags = splitCommaSeparated(getText(formData, "tags"));
  const notes = getText(formData, "notes");
  const sourceLabel = `${channel}:${source}`;

  const created = await createDraftViaMcp({
    type: mapPayloadTypeToDraftType(payloadType),
    title,
    summary,
    body,
    source: sourceLabel,
    tags,
    status: "draft"
  });

  await db.importLog.create({
    data: {
      source: sourceLabel,
      payloadType,
      payloadSummary: summary,
      state: ImportState.VALIDATED,
      contentId: created.id,
      notes:
        `Canal: ${channel}. ` +
        "Importacion creada via create_draft de la capa MCP." +
        (notes ? ` ${notes}` : "")
    }
  });

  revalidatePath("/panel");
  revalidatePath("/panel/importaciones");
  redirect("/panel/importaciones");
}
