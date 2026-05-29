import { NextResponse } from "next/server";
import { readMcpResource } from "@/lib/mcp/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uri = url.searchParams.get("uri");

    if (!uri) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing uri parameter"
        },
        { status: 400 }
      );
    }

    const resource = await readMcpResource(uri);

    return NextResponse.json({
      ok: true,
      resource
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown MCP resource error"
      },
      { status: 400 }
    );
  }
}
