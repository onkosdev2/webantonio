import { NextResponse } from "next/server";
import { ImportState } from "@prisma/client";
import { db } from "@/lib/db";
import { createDraftViaMcp } from "@/lib/mcp/server";
import { contentImportSchema } from "@/lib/validation/content";

export async function POST(request: Request) {
  const payload = await request.json();
  const result = contentImportSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: result.error.flatten()
      },
      { status: 400 }
    );
  }

  if (result.data.type === "gallery_asset") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "gallery_asset todavia no entra por create_draft. Usa importacion de media dedicada."
      },
      { status: 400 }
    );
  }

  const created = await createDraftViaMcp({
    type: result.data.type,
    title: result.data.title,
    summary: result.data.summary,
    body: result.data.body,
    source: result.data.source,
    tags: result.data.tags,
    status: result.data.status,
    tumorType: result.data.tumorType,
    stage: result.data.stage,
    biomarkers: result.data.biomarkers
  });

  await db.importLog.create({
    data: {
      source: result.data.source,
      payloadType: result.data.type,
      payloadSummary: result.data.summary,
      state: ImportState.VALIDATED,
      contentId: created.id,
      notes: "Canal: api. Importacion creada via /api/import/content y enrutada por MCP."
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Payload importado y convertido en borrador via MCP.",
    data: created
  });
}
