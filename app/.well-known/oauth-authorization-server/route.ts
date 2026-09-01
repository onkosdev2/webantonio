import { MCP_SCOPES, siteUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const issuer = siteUrl();

  return Response.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      authorization_response_iss_parameter_supported: true,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: MCP_SCOPES
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
