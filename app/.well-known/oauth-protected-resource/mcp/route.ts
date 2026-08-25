/**
 * This MCP server intentionally does not implement OAuth. A minimal protected
 * resource document keeps Secure MCP Tunnel's discovery check from trying to
 * parse Next.js' HTML not-found document as metadata while advertising that
 * there is no authorization server to use.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    resource: "http://127.0.0.1:3000/mcp",
    authorization_servers: []
  });
}
