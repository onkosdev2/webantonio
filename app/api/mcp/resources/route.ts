import { NextResponse } from "next/server";
import { listMcpResources } from "@/lib/mcp/server";

export async function GET() {
  const resources = await listMcpResources();

  return NextResponse.json({
    ok: true,
    resources
  });
}
