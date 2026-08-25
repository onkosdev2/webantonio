import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/session";
import { listMcpResources } from "@/lib/mcp/server";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resources = await listMcpResources();

  return NextResponse.json({
    ok: true,
    resources
  });
}
