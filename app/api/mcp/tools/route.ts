import { NextResponse } from "next/server";
import { callMcpTool, listMcpTools } from "@/lib/mcp/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    tools: listMcpTools()
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await callMcpTool(payload.tool, payload.args ?? {});

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown MCP tool error"
      },
      { status: 400 }
    );
  }
}
