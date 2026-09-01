import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createChatGptMcpServer } from "@/lib/mcp/chatgpt-server";
import {
  authorizeMcpBearer,
  protectedResourceMetadataUrl
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function isAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.MCP_ALLOW_UNAUTHENTICATED === "true") return true;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const token = authorization.slice("Bearer ".length);
  const expected = process.env.MCP_API_TOKEN;
  if (expected && token === expected) return true;

  return Boolean(await authorizeMcpBearer(token));
}

async function handle(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "No autorizado" }, id: null },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${protectedResourceMetadataUrl()}", scope="mcp:read mcp:write"`
        }
      }
    );
  }

  // This server is stateless and does not expose a server-to-client SSE
  // channel. A sessionless GET would otherwise remain open until the client
  // timeout, which makes Secure MCP Tunnel's startup probe look unhealthy.
  if (request.method === "GET" && !request.headers.get("mcp-session-id")) {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  // Secure MCP Tunnel probes modern MCP servers with server/discover before
  // falling back to the legacy initialize handshake. The SDK version used by
  // this app predates that request, so answer it statelessly and keep the
  // existing transport for all regular MCP operations.
  if (request.method === "POST") {
    const body = await request.clone().json().catch(() => null) as { id?: string | number | null; method?: string } | null;
    if (body?.method === "server/discover") {
      return Response.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          resultType: "complete",
          supportedVersions: ["2025-11-25"],
          capabilities: { tools: { listChanged: true } },
          serverInfo: { name: "onkos-content-publisher", version: "2.1.0" },
          instructions: "Servidor MCP de ONKOS para casos clínicos y noticias de actualidad oncológica."
        }
      });
    }
  }

  const server = createChatGptMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
