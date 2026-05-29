import { NextResponse } from "next/server";
import { ingestOncologyNews } from "@/lib/news/ingest";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const limitPerSource = Number(url.searchParams.get("limitPerSource") ?? "4");
    const maxItems = Number(url.searchParams.get("maxItems") ?? "12");
    const maxAiItems = Number(url.searchParams.get("maxAiItems") ?? "5");

    const result = await ingestOncologyNews({
      limitPerSource,
      maxItems,
      maxAiItems
    });

    return NextResponse.json({
      ok: true,
      message: "Ingestion de noticias completada.",
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown news ingest error"
      },
      { status: 500 }
    );
  }
}
