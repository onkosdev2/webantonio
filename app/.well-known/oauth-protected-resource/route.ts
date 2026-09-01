import { MCP_SCOPES, mcpResource, siteUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    resource: mcpResource(),
    authorization_servers: [siteUrl()],
    scopes_supported: MCP_SCOPES,
    resource_documentation: `${siteUrl()}/panel/mcp`
  });
}
