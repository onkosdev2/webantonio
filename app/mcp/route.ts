import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createChatGptMcpServer } from "@/lib/mcp/chatgpt-server";
import {
  authorizeMcpBearer,
  protectedResourceMetadataUrl
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const SDK_PROTOCOL_VERSION = "2025-11-25";
const SERVER_INFO = { name: "onkos-content-publisher", version: "2.3.0" };
const READ_TOOLS = new Set(["list_recent_clinical_cases", "search_clinical_cases", "get_clinical_case", "list_recent_news", "search_news", "get_news_item", "find_reusable_news_images"]);

function modernRequestVersion(rpcRequest: {
  params?: { _meta?: Record<string, unknown> };
} | null) {
  return rpcRequest?.params?._meta?.["io.modelcontextprotocol/protocolVersion"];
}

async function modernizeResponse(
  response: Response,
  rpcMethod: string | null,
  modern: boolean
) {
  if (!modern || !response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    return response;
  }

  const payload = await response.clone().json().catch(() => null) as {
    result?: Record<string, unknown>;
  } | null;
  if (!payload?.result || typeof payload.result !== "object") return response;

  const result = payload.result;
  result.resultType ??= "complete";
  result._meta = {
    ...(typeof result._meta === "object" && result._meta ? result._meta : {}),
    "io.modelcontextprotocol/serverInfo": SERVER_INFO
  };

  if (rpcMethod === "tools/list") {
    const tools = Array.isArray(result.tools) ? result.tools : [];
    result.tools = tools.map((tool) => {
      if (!tool || typeof tool !== "object") return tool;
      const definition = tool as Record<string, unknown>;
      const annotations = definition.annotations as { readOnlyHint?: boolean } | undefined;
      const scopes = annotations?.readOnlyHint
        ? ["mcp:read"]
        : ["mcp:read", "mcp:write"];
      const securitySchemes = [{ type: "oauth2", scopes }];

      return {
        ...definition,
        securitySchemes,
        _meta: {
          ...(typeof definition._meta === "object" && definition._meta ? definition._meta : {}),
          securitySchemes
        }
      };
    });
    result.ttlMs ??= 60_000;
    result.cacheScope ??= "private";
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function isAuthorized(request: Request, rpcMethod: string | null, toolName?: string) {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.MCP_ALLOW_UNAUTHENTICATED === "true") return true;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const token = authorization.slice("Bearer ".length);
  const expected = process.env.MCP_API_TOKEN;
  if (expected && token === expected) return true;

  const payload = await authorizeMcpBearer(token);
  if (!payload) return false;
  const scopes = payload.scope.split(" ");
  return scopes.includes("mcp:read") && (rpcMethod !== "tools/call" || READ_TOOLS.has(toolName || "") || scopes.includes("mcp:write"));
}

async function handle(request: Request) {
  const rpcRequest = request.method === "POST"
    ? await request.clone().json().catch(() => null) as {
        id?: string | number | null;
        method?: string;
        params?: {
          protocolVersion?: string;
          _meta?: Record<string, unknown>;
          [key: string]: unknown;
        };
      } | null
    : null;
  const rpcMethod = rpcRequest?.method ?? null;

  let authorized = false;
  try {
    authorized = await isAuthorized(request, rpcMethod, typeof rpcRequest?.params?.name === "string" ? rpcRequest.params.name : undefined);
  } catch (error) {
    console.error("[mcp] authorization failed unexpectedly", {
      httpMethod: request.method,
      rpcMethod,
      error: error instanceof Error ? error.name : "UnknownError"
    });
  }

  console.info("[mcp] request", {
    httpMethod: request.method,
    rpcMethod,
    authorized
  });

  if (!authorized) {
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

  // Let the SDK answer GET requests with the Streamable HTTP SSE channel.
  // Current OpenAI clients probe this channel before initialization; returning
  // 405 here makes them fall back to a legacy /sse URL that this server does
  // not expose and surfaces as "MCP SSE probe returned 404".

  // Secure MCP Tunnel probes modern MCP servers with server/discover before
  // falling back to the legacy initialize handshake. The SDK version used by
  // this app predates that request, so answer it statelessly and keep the
  // existing transport for all regular MCP operations.
  if (request.method === "POST") {
    if (rpcRequest?.method === "server/discover") {
      console.info("[mcp] response", { rpcMethod, status: 200, transport: "discover" });
      return Response.json({
        jsonrpc: "2.0",
        id: rpcRequest.id ?? null,
        result: {
          resultType: "complete",
          supportedVersions: [MODERN_PROTOCOL_VERSION],
          capabilities: { tools: {} },
          _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
          instructions: "Servidor MCP de ONKOS para casos clínicos y noticias de actualidad oncológica.",
          ttlMs: 60_000,
          cacheScope: "private"
        }
      });
    }
  }

  const modern = modernRequestVersion(rpcRequest) === MODERN_PROTOCOL_VERSION ||
    request.headers.get("mcp-protocol-version") === MODERN_PROTOCOL_VERSION;
  let transportRequest = request;

  // The installed SDK predates the 2026-07-28 protocol and rejects its HTTP
  // header before dispatching otherwise compatible methods such as tools/list.
  // Normalize only the request passed to the legacy transport, then translate
  // its response back to the modern wire shape below.
  if (modern) {
    const headers = new Headers(request.headers);
    headers.set("mcp-protocol-version", SDK_PROTOCOL_VERSION);
    transportRequest = new Request(request, { headers });
  }

  const server = createChatGptMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    // Flush the SSE response promptly so health probes see a live stream
    // instead of timing out while waiting for the SDK's 15-second default.
    keepAliveMs: 1_000
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(transportRequest);
    const compatibleResponse = await modernizeResponse(response, rpcMethod, modern);
    console.info("[mcp] response", {
      rpcMethod,
      status: compatibleResponse.status,
      contentType: compatibleResponse.headers.get("content-type"),
      protocolVersion: modern ? MODERN_PROTOCOL_VERSION : "legacy"
    });
    return compatibleResponse;
  } catch (error) {
    console.error("[mcp] request failed", {
      httpMethod: request.method,
      rpcMethod,
      error: error instanceof Error ? error.name : "UnknownError"
    });
    throw error;
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
